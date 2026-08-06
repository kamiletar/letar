/**
 * Email Service
 *
 * Высокоуровневые функции для отправки типовых писем
 * с автоматическим брендингом из env переменных
 */

import { createEmailProvider, getConfigFromEnv } from './provider'
import { createBaseTemplate, createButton, createGreeting, createLinkFallback, createParagraph } from './templates/base'
import { createInvitationEmailHtml, createInvitationEmailText } from './templates/invitation'
import { createMagicLinkEmailHtml, createMagicLinkEmailText } from './templates/magic-link'
import { createPasswordResetEmailHtml, createPasswordResetEmailText } from './templates/password-reset'
import { createStudentActivationEmailHtml, createStudentActivationEmailText } from './templates/student-activation'
import { createVerificationEmailHtml, createVerificationEmailText } from './templates/verification'
import type {
  BrandingConfig,
  GenericEmailParams,
  InvitationEmailParams,
  MagicLinkEmailParams,
  PasswordResetEmailParams,
  SendEmailResult,
  VerificationEmailParams,
} from './types'

// === Брендинг ===

/**
 * Получает брендинг из env переменных
 */
export function getBrandingFromEnv(): BrandingConfig {
  const appUrl = process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'https://example.com'
  return {
    appName: process.env.SMTP_FROM_NAME || 'App',
    appUrl,
    headerColor: process.env.EMAIL_HEADER_COLOR || '#2d3748',
    buttonColor: process.env.EMAIL_BUTTON_COLOR || '#3182ce',
    headerEmoji: process.env.EMAIL_HEADER_EMOJI || '✉️',
    // URL для отписки — по умолчанию /unsubscribe на основном домене
    unsubscribeUrl: process.env.EMAIL_UNSUBSCRIBE_URL || `${appUrl}/unsubscribe`,
  }
}

// === Email функции ===

/**
 * Отправляет письмо верификации email
 *
 * @example
 * ```ts
 * await sendVerificationEmail({
 *   to: 'user@example.com',
 *   userName: 'John',
 *   verificationUrl: 'https://app.com/verify/token123',
 *   pin: '123456', // опционально
 * })
 * ```
 */
export async function sendVerificationEmail(
  params: VerificationEmailParams,
  branding?: Partial<BrandingConfig>,
): Promise<SendEmailResult> {
  const brand = { ...getBrandingFromEnv(), ...branding }
  const provider = createEmailProvider(getConfigFromEnv())

  const html = createVerificationEmailHtml({ ...params, branding: brand })
  const text = createVerificationEmailText({ ...params, branding: brand })

  return provider.sendEmail({
    to: params.to,
    subject: `✉️ Подтверждение email — ${brand.appName}`,
    html,
    text,
    meta: { type: 'verification' },
  })
}

/**
 * Отправляет письмо сброса пароля
 *
 * @example
 * ```ts
 * await sendPasswordResetEmail({
 *   to: 'user@example.com',
 *   userName: 'John',
 *   resetUrl: 'https://app.com/reset/token123',
 * })
 * ```
 */
export async function sendPasswordResetEmail(
  params: PasswordResetEmailParams,
  branding?: Partial<BrandingConfig>,
): Promise<SendEmailResult> {
  const brand = { ...getBrandingFromEnv(), ...branding }
  const provider = createEmailProvider(getConfigFromEnv())

  const html = createPasswordResetEmailHtml({ ...params, branding: brand })
  const text = createPasswordResetEmailText({ ...params, branding: brand })

  return provider.sendEmail({
    to: params.to,
    subject: `🔐 Сброс пароля — ${brand.appName}`,
    html,
    text,
    meta: { type: 'password-reset' },
  })
}

/**
 * Отправляет Magic Link для входа без пароля
 *
 * @example
 * ```ts
 * await sendMagicLinkEmail({
 *   to: 'user@example.com',
 *   userName: 'John',
 *   magicLinkUrl: 'https://app.com/magic-link/token123',
 * })
 * ```
 */
export async function sendMagicLinkEmail(
  params: MagicLinkEmailParams,
  branding?: Partial<BrandingConfig>,
): Promise<SendEmailResult> {
  const brand = { ...getBrandingFromEnv(), ...branding }
  const provider = createEmailProvider(getConfigFromEnv())

  const html = createMagicLinkEmailHtml({ ...params, branding: brand })
  const text = createMagicLinkEmailText({ ...params, branding: brand })

  return provider.sendEmail({
    to: params.to,
    subject: `🔑 Вход в ${brand.appName}`,
    html,
    text,
    meta: { type: 'magic-link' },
  })
}

/**
 * Отправляет приглашение в организацию
 *
 * @example
 * ```ts
 * await sendInvitationEmail({
 *   to: 'user@example.com',
 *   inviterName: 'Admin',
 *   organizationName: 'My Team',
 *   inviteUrl: 'https://app.com/invite/token123',
 * })
 * ```
 */
export async function sendInvitationEmail(
  params: InvitationEmailParams,
  branding?: Partial<BrandingConfig>,
): Promise<SendEmailResult> {
  const brand = { ...getBrandingFromEnv(), ...branding }
  const provider = createEmailProvider(getConfigFromEnv())

  const html = createInvitationEmailHtml({ ...params, branding: brand })
  const text = createInvitationEmailText({ ...params, branding: brand })

  return provider.sendEmail({
    to: params.to,
    subject: `🤝 Приглашение в ${params.organizationName} — ${brand.appName}`,
    html,
    text,
    meta: { type: 'invitation' },
  })
}

/**
 * Параметры письма активации ученика
 */
export interface StudentActivationEmailParams {
  /** Email ученика */
  to: string
  /** Название школы */
  schoolName: string
  /** Имя ученика (опционально) */
  studentName?: string
  /** URL активации */
  activationUrl: string
  /** Срок действия в днях */
  expiresInDays?: number
}

/**
 * Отправляет письмо активации аккаунта ученику
 *
 * @example
 * ```ts
 * await sendStudentActivationEmail({
 *   to: 'student@example.com',
 *   schoolName: 'Автошкола "Направа"',
 *   studentName: 'Иван',
 *   activationUrl: 'https://app.com/join-school/token123',
 * })
 * ```
 */
export async function sendStudentActivationEmail(
  params: StudentActivationEmailParams,
  branding?: Partial<BrandingConfig>,
): Promise<SendEmailResult> {
  const brand = { ...getBrandingFromEnv(), ...branding }
  const provider = createEmailProvider(getConfigFromEnv())

  const html = createStudentActivationEmailHtml({
    ...params,
    expiresInDays: params.expiresInDays || 7,
    branding: brand,
  })
  const text = createStudentActivationEmailText({
    ...params,
    expiresInDays: params.expiresInDays || 7,
    branding: brand,
  })

  return provider.sendEmail({
    to: params.to,
    subject: `🚗 Добро пожаловать в ${params.schoolName} — ${brand.appName}`,
    html,
    text,
    meta: { type: 'student-activation' },
  })
}

/**
 * Отправляет произвольное письмо с базовым шаблоном
 *
 * @example
 * ```ts
 * await sendGenericEmail({
 *   to: 'user@example.com',
 *   subject: 'Уведомление',
 *   heading: 'Новое уведомление',
 *   greeting: 'Привет, Иван!',
 *   body: 'У вас новое сообщение.',
 *   buttonText: 'Посмотреть',
 *   buttonUrl: 'https://app.com/messages',
 * })
 * ```
 */
export async function sendGenericEmail(
  params: GenericEmailParams,
  branding?: Partial<BrandingConfig>,
): Promise<SendEmailResult> {
  const brand = { ...getBrandingFromEnv(), ...branding }
  const provider = createEmailProvider(getConfigFromEnv())

  // Собираем контент
  let content = ''
  if (params.greeting) {
    content += createGreeting(params.greeting)
  }
  content += createParagraph(params.body)
  if (params.buttonText && params.buttonUrl) {
    content += createButton(params.buttonText, params.buttonUrl, brand.buttonColor)
    content += createLinkFallback(params.buttonUrl, brand.buttonColor)
  }
  if (params.footer) {
    content += createParagraph(params.footer, '#999')
  }

  const html = createBaseTemplate({
    heading: params.heading,
    content,
    branding: brand,
  })

  // Текстовая версия
  let text = `${params.heading}\n\n`
  if (params.greeting) {
    text += `${params.greeting}\n\n`
  }
  text += `${params.body}\n\n`
  if (params.buttonText && params.buttonUrl) {
    text += `${params.buttonText}: ${params.buttonUrl}\n\n`
  }
  if (params.footer) {
    text += `${params.footer}\n\n`
  }
  text += `---\nЭто автоматическое письмо от ${brand.appName}.`

  return provider.sendEmail({
    to: params.to,
    subject: params.subject,
    html,
    text: text.trim(),
    meta: { type: 'generic' },
  })
}
