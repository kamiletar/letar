/**
 * Провайдер для отправки email через Nodemailer
 *
 * Использует @letar/email для конфигурации:
 * - Maddy SMTP в продакшене (mail.letar.best)
 * - Mailhog для локальной разработки (EMAIL_USE_MAILHOG=true)
 */

import { createEmailProvider, getConfigFromEnv, verifyConnection } from '@letar/email'
import type { EmailProvider } from './email-service'

// Singleton провайдер
let cachedProvider: ReturnType<typeof createEmailProvider> | null = null

/**
 * Создаёт EmailProvider для использования с sendEmailToUser
 * Использует @letar/email под капотом
 */
export function createNodemailerProvider(): EmailProvider {
  if (!cachedProvider) {
    cachedProvider = createEmailProvider(getConfigFromEnv())
  }
  return cachedProvider
}

/**
 * Проверяет подключение к SMTP серверу
 */
export async function verifyEmailConnection(): Promise<boolean> {
  return verifyConnection()
}
