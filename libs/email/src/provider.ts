/**
 * Email провайдер на базе Nodemailer
 *
 * Поддерживает:
 * - Maddy SMTP сервер (production)
 * - Mailhog для локальной разработки
 */

import type { Transporter } from 'nodemailer'
import nodemailer from 'nodemailer'
import { toASCII } from 'punycode/'
import { reportEmailFailure } from './failure-report'
import type { EmailConfig, EmailProvider, SendEmailParams, SendEmailResult } from './types'

/**
 * Конвертирует email с IDN доменом в ASCII (punycode)
 * Например: noreply@направа.рф → noreply@xn--80aaac0ct.xn--p1ai
 *
 * MailHog не поддерживает IDN домены, поэтому нужна конвертация
 */
function emailToASCII(email: string): string {
  const atIndex = email.lastIndexOf('@')
  if (atIndex === -1) {
    return email
  }

  const localPart = email.slice(0, atIndex)
  const domain = email.slice(atIndex + 1)

  // Проверяем, содержит ли домен не-ASCII символы
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(domain)) {
    return email // Уже ASCII
  }

  try {
    const asciiDomain = toASCII(domain)
    return `${localPart}@${asciiDomain}`
  } catch {
    return email // Если не удалось конвертировать, возвращаем как есть
  }
}

// === Singleton транспорт ===

let transporter: Transporter | null = null
let currentConfig: EmailConfig | null = null

/**
 * Получает конфигурацию из env переменных
 */
export function getConfigFromEnv(): EmailConfig {
  return {
    host: process.env.SMTP_HOST || 'mail.letar.best',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    fromEmail: process.env.SMTP_FROM_EMAIL || process.env.EMAIL_FROM || process.env.SMTP_USER || '',
    fromName: process.env.SMTP_FROM_NAME || 'Noreply',
  }
}

/**
 * Проверяет, используется ли Mailhog
 */
export function isMailhogEnabled(): boolean {
  return process.env.EMAIL_USE_MAILHOG === 'true'
}

/**
 * Создаёт или возвращает существующий транспорт
 */
function getTransporter(config?: EmailConfig): Transporter {
  // Если уже есть транспорт с той же конфигурацией — возвращаем его
  if (transporter && currentConfig && config === currentConfig) {
    return transporter
  }

  // Получаем конфигурацию
  const cfg = config || getConfigFromEnv()

  if (isMailhogEnabled()) {
    // Mailhog для локальной разработки
    transporter = nodemailer.createTransport({
      host: process.env.MAILHOG_HOST || 'localhost',
      port: Number(process.env.MAILHOG_SMTP_PORT) || 1025,
      secure: false,
      ignoreTLS: true,
    })
    // eslint-disable-next-line no-console -- информационное сообщение о режиме email
    console.log('[Email] Using Mailhog for local development')
  } else {
    // Maddy SMTP для продакшена
    if (!cfg.user || !cfg.password) {
      throw new Error(
        '[Email] SMTP credentials not configured. Set SMTP_USER and SMTP_PASSWORD, or enable EMAIL_USE_MAILHOG=true for development.',
      )
    }

    transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: {
        user: cfg.user,
        pass: cfg.password,
      },
      // Быстрый fail при недоступном SMTP — без таймаутов nodemailer может висеть до 2 минут,
      // блокируя весь sign-up запрос и вызывая бесконечный спиннер на клиенте.
      connectionTimeout: 10_000,
      socketTimeout: 15_000,
      greetingTimeout: 5_000,
    })
    // eslint-disable-next-line no-console -- информационное сообщение о SMTP сервере
    console.log(`[Email] Using SMTP server: ${cfg.host}:${cfg.port}`)
  }

  currentConfig = cfg
  return transporter
}

/**
 * Сбрасывает транспорт (для тестов)
 */
export function resetTransporter(): void {
  transporter = null
  currentConfig = null
}

/**
 * Создаёт EmailProvider для использования в приложении
 *
 * @example
 * ```ts
 * const emailProvider = createEmailProvider()
 * await emailProvider.sendEmail({ to, subject, html, text })
 * ```
 */
export function createEmailProvider(config?: EmailConfig): EmailProvider {
  const cfg = config || getConfigFromEnv()

  return {
    async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
      try {
        const transport = getTransporter(cfg)

        // Формируем from адрес
        // Mailhog не поддерживает IDN — конвертируем в punycode
        // Maddy: оставляем Unicode для корректной работы SMTPUTF8 downgrade
        const fromEmail = isMailhogEnabled() ? emailToASCII(cfg.fromEmail) : cfg.fromEmail
        const from = `"${cfg.fromName}" <${fromEmail}>`

        // Nodemailer конвертирует IDN домены в punycode для SMTP MAIL FROM,
        // из-за чего SMTPUTF8 не запрашивается и Maddy не делает downgrade.
        // Явный envelope с Unicode адресом обходит punycode конвертацию
        // и заставляет nodemailer запросить SMTPUTF8 у Maddy.
        const useExplicitEnvelope = !isMailhogEnabled() && fromEmail !== emailToASCII(fromEmail)

        const info = await transport.sendMail({
          from,
          to: params.to,
          subject: params.subject,
          html: params.html,
          text: params.text,
          ...(useExplicitEnvelope && {
            envelope: {
              from: fromEmail,
              to: params.to,
            },
          }),
        })

        // eslint-disable-next-line no-console -- логирование успешной отправки
        console.log(`[Email] Sent to ${params.to}: ${info.messageId}`)
        return { success: true, messageId: info.messageId }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        // Централизованный структурный лог + опциональный алертер (§ Этап 0)
        reportEmailFailure({ type: params.meta?.type ?? 'unknown', to: params.to, error: message })
        return {
          success: false,
          error: message,
        }
      }
    },
  }
}

/**
 * Проверяет подключение к SMTP серверу
 */
export async function verifyConnection(config?: EmailConfig): Promise<boolean> {
  try {
    const transport = getTransporter(config)
    await transport.verify()
    // eslint-disable-next-line no-console -- подтверждение подключения
    console.log('[Email] SMTP connection verified')
    return true
  } catch (error) {
    console.error('[Email] SMTP connection failed:', error)
    return false
  }
}
