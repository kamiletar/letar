/**
 * @letar/email - Универсальная библиотека для отправки email
 *
 * Использование:
 * ```ts
 * import { sendVerificationEmail, sendPasswordResetEmail } from '@letar/email'
 *
 * await sendVerificationEmail({
 *   to: 'user@example.com',
 *   verificationUrl: 'https://app.com/verify/token',
 * })
 * ```
 *
 * Конфигурация через env переменные:
 * - SMTP_HOST - хост SMTP сервера (default: mail.letar.best)
 * - SMTP_PORT - порт SMTP (default: 587)
 * - SMTP_USER - логин SMTP
 * - SMTP_PASSWORD - пароль SMTP
 * - SMTP_FROM_EMAIL - email отправителя
 * - SMTP_FROM_NAME - имя отправителя (также appName)
 * - EMAIL_USE_MAILHOG - использовать Mailhog для разработки
 *
 * Брендинг:
 * - BETTER_AUTH_URL или NEXTAUTH_URL - URL приложения
 * - EMAIL_HEADER_COLOR - цвет шапки (hex)
 * - EMAIL_BUTTON_COLOR - цвет кнопки (hex)
 */

// === Типы ===
export type {
  BrandingConfig,
  EmailConfig,
  EmailProvider,
  GenericEmailParams,
  InvitationEmailParams,
  MagicLinkEmailParams,
  PasswordResetEmailParams,
  SendEmailParams,
  SendEmailResult,
  VerificationEmailParams,
} from './types'

// === Провайдер ===
export { createEmailProvider, getConfigFromEnv, isMailhogEnabled, resetTransporter, verifyConnection } from './provider'

// === Высокоуровневые функции отправки ===
export {
  getBrandingFromEnv,
  sendGenericEmail,
  sendInvitationEmail,
  sendMagicLinkEmail,
  sendPasswordResetEmail,
  sendStudentActivationEmail,
  sendVerificationEmail,
} from './service'

export type { StudentActivationEmailParams } from './service'

// === Шаблоны (для кастомизации) ===
export {
  // Базовые компоненты
  createBaseTemplate,
  createButton,
  createGreeting,
  // Шаблоны
  createInvitationEmailHtml,
  createInvitationEmailText,
  createLinkFallback,
  createMagicLinkEmailHtml,
  createMagicLinkEmailText,
  createParagraph,
  createPasswordResetEmailHtml,
  createPasswordResetEmailText,
  createPinBlock,
  createSmallText,
  createVerificationEmailHtml,
  createVerificationEmailText,
  createWarning,
} from './templates'
