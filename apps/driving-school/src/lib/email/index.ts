/**
 * Email сервис для бизнес-уведомлений driving-school
 *
 * Для auth-писем (верификация, сброс пароля, приглашения)
 * используй @letar/email напрямую.
 *
 * Этот модуль содержит только специфичную логику:
 * - sendEmailToUser - отправка с учётом настроек пользователя
 * - formatEmailContent - форматирование для NotificationType
 * - createNodemailerProvider - провайдер для notification orchestrator
 */

export {
  formatEmailContent,
  getEmailSubject,
  sendEmailToUser,
  type EmailProvider,
  type EmailRepository,
  type NotificationSettingsData,
  type SendEmailResult,
  type UserData,
} from './email-service'

export { createNodemailerProvider, verifyEmailConnection } from './nodemailer-provider'
