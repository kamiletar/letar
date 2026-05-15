/**
 * Типы и интерфейсы для @letar/email
 */

// === Email Provider ===

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  text: string
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface EmailProvider {
  sendEmail: (params: SendEmailParams) => Promise<SendEmailResult>
}

// === Email Config ===

export interface EmailConfig {
  /** SMTP хост (default: mail.letar.best) */
  host?: string
  /** SMTP порт (default: 587) */
  port?: number
  /** Использовать SSL/TLS (default: false для STARTTLS) */
  secure?: boolean
  /** SMTP пользователь */
  user: string
  /** SMTP пароль */
  password: string
  /** Email отправителя */
  fromEmail: string
  /** Имя отправителя */
  fromName: string
}

// === Template Types ===

export interface VerificationEmailParams {
  /** Email получателя */
  to: string
  /** Имя пользователя */
  userName?: string
  /** URL для верификации (обязателен если нет pin) */
  verificationUrl?: string
  /** PIN-код (обязателен если нет verificationUrl) */
  pin?: string
}

export interface PasswordResetEmailParams {
  /** Email получателя */
  to: string
  /** Имя пользователя */
  userName?: string
  /** URL для сброса пароля */
  resetUrl: string
  /** PIN-код (опционально) */
  pin?: string
}

export interface MagicLinkEmailParams {
  /** Email получателя */
  to: string
  /** Имя пользователя */
  userName?: string
  /** URL для входа */
  magicLinkUrl: string
}

export interface InvitationEmailParams {
  /** Email получателя */
  to: string
  /** Имя пригласившего */
  inviterName: string
  /** Название организации */
  organizationName: string
  /** URL приглашения */
  inviteUrl: string
}

// === Generic Email ===

export interface GenericEmailParams {
  /** Email получателя */
  to: string
  /** Тема письма */
  subject: string
  /** Заголовок в шапке */
  heading: string
  /** Текст приветствия */
  greeting?: string
  /** Основной текст */
  body: string
  /** Текст кнопки */
  buttonText?: string
  /** URL кнопки */
  buttonUrl?: string
  /** Дополнительный текст после кнопки */
  footer?: string
}

// === Branding ===

export interface BrandingConfig {
  /** Название приложения */
  appName: string
  /** URL приложения */
  appUrl: string
  /** Цвет шапки (hex) */
  headerColor?: string
  /** Цвет кнопки (hex) */
  buttonColor?: string
  /** Эмодзи для шапки */
  headerEmoji?: string
  /** URL для отписки от рассылок */
  unsubscribeUrl?: string
}
