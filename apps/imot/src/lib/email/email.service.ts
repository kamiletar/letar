/**
 * Email Service для отправки уведомлений
 * Использует @letar/email для единообразной отправки через Maddy SMTP
 */

import { createEmailProvider, getConfigFromEnv, verifyConnection } from '@letar/email'

// Singleton провайдер
let cachedProvider: ReturnType<typeof createEmailProvider> | null = null

/**
 * Получить email provider
 */
function getProvider() {
  if (!cachedProvider) {
    cachedProvider = createEmailProvider(getConfigFromEnv())
  }
  return cachedProvider
}

/**
 * Интерфейс для отправки email
 */
export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

/**
 * Отправить email
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const provider = getProvider()
  const to = Array.isArray(options.to) ? options.to.join(', ') : options.to

  const result = await provider.sendEmail({
    to,
    subject: options.subject,
    html: options.html,
    text: options.text ?? '',
  })

  if (!result.success) {
    console.error('Failed to send email:', result.error)
    throw new Error('Failed to send email notification')
  }
}

/**
 * Проверить подключение к SMTP серверу
 */
export async function verifyEmailConnection(): Promise<boolean> {
  return verifyConnection()
}
