/**
 * Сервис для отправки email-уведомлений
 *
 * Бизнес-логика:
 * - Отправка email через SMTP (Nodemailer)
 * - Фильтрация по настройкам пользователя
 * - Форматирование HTML/text шаблонов для разных типов уведомлений
 */

import { type NotificationSettingsData, shouldSendNotification } from '@/lib/notifications'
import type { NotificationType } from '@letar/driving-school-db/prisma'

// === Типы ===

export type { NotificationSettingsData }

export interface UserData {
  id: string
  name: string | null
  email: string | null
  role?: string // Опциональное поле для совместимости с TelegramRepository
}

export interface EmailRepository {
  getUserById: (id: string) => Promise<UserData | null>
  getNotificationSettings: (userId: string) => Promise<NotificationSettingsData | null>
}

export interface EmailProvider {
  sendEmail: (params: {
    to: string
    subject: string
    html: string
    text: string
  }) => Promise<{ success: boolean; messageId?: string; error?: string }>
}

// === Результаты ===

export type SendEmailResult =
  | { success: true; sent: boolean; skipped?: boolean; reason?: string; messageId?: string }
  | { success: false; error: string }

// === Константы ===

// Дефолтные настройки (emailEnabled = true по умолчанию)
const DEFAULT_SETTINGS: Omit<NotificationSettingsData, 'id' | 'userId' | 'updatedAt'> = {
  pushEnabled: true,
  emailEnabled: true,
  telegramEnabled: false,
  reminderHours: 24,
  lessonReminders: true,
  lessonChanges: true,
  penaltyAlerts: true,
  marketingEmails: false,
}

// Эмодзи для разных типов уведомлений
const TYPE_EMOJI: Record<NotificationType, string> = {
  LESSON_CREATED: '📚',
  LESSON_CONFIRMED: '✅',
  LESSON_CANCELLED: '❌',
  LESSON_REMINDER: '⏰',
  LESSON_NEEDS_RESCHEDULE: '📅',
  PENALTY_CHARGED: '⚠️',
  INVITATION_RECEIVED: '📨',
  STUDENT_TRANSFER: '🔄',
  INSTRUCTOR_RETURNED: '🎉',
  SCHOOL_INVITE: '🏫',
  CHAT_MESSAGE: '💬',
  CHAT_MENTION: '📢',
  ENROLLMENT_REQUEST_RECEIVED: '📝',
  ENROLLMENT_REQUEST_APPROVED: '✅',
  ENROLLMENT_REQUEST_REJECTED: '❌',
  // Партнёрство
  PARTNERSHIP_REQUEST_RECEIVED: '🤝',
  PARTNERSHIP_REQUEST_ACCEPTED: '✅',
  PARTNERSHIP_REQUEST_REJECTED: '❌',
  PARTNERSHIP_SUSPENDED: '⏸️',
  PARTNERSHIP_TERMINATED: '🚫',
  SURVEY_SENT: '📋',
}

// === Функции ===

/**
 * Формирует тему письма для типа уведомления
 */
export function getEmailSubject(type: NotificationType, title: string): string {
  const emoji = TYPE_EMOJI[type] || '📬'
  return `${emoji} ${title} — НаПрава.РФ`
}

/**
 * Форматирует HTML и текстовый контент письма
 */
export function formatEmailContent(params: {
  type: NotificationType
  title: string
  body: string
  userName: string
  data?: Record<string, unknown>
  appUrl?: string
}): { html: string; text: string } {
  const { type, title, body, userName, data, appUrl } = params

  // Базовый URL приложения
  const baseUrl = appUrl || process.env.BETTER_AUTH_URL || 'https://xn--80aaah6cnh.xn--p1ai'

  // Формируем ссылку на действие
  let actionUrl = baseUrl
  let actionText = 'Перейти в приложение'

  if (data?.lessonId) {
    actionUrl = `${baseUrl}/lessons/${data.lessonId}`
    actionText = 'Посмотреть занятие'
  } else if (data?.invitationId) {
    actionUrl = `${baseUrl}/invitations/${data.invitationId}`
    actionText = 'Посмотреть приглашение'
  } else if (data?.transferId) {
    actionUrl = `${baseUrl}/transfers/${data.transferId}`
    actionText = 'Посмотреть передачу'
  } else if (data?.penaltyId) {
    actionUrl = `${baseUrl}/penalties/${data.penaltyId}`
    actionText = 'Посмотреть штраф'
  }

  // Дополнительная информация из data
  const instructorName = data?.instructorName as string | undefined
  const studentName = data?.studentName as string | undefined
  const penaltyType = data?.penaltyType as string | undefined

  // HTML шаблон
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Шапка -->
          <tr>
            <td style="background-color: #1a365d; padding: 30px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${TYPE_EMOJI[type]} ${title}
              </h1>
            </td>
          </tr>

          <!-- Контент -->
          <tr>
            <td style="padding: 30px;">
              <p style="margin: 0 0 20px; font-size: 16px;">
                Здравствуйте${userName ? `, <strong>${userName}</strong>` : ''}!
              </p>

              <p style="margin: 0 0 20px; font-size: 16px; color: #555;">
                ${body}
              </p>

              ${
                instructorName
                  ? `<p style="margin: 0 0 10px; font-size: 14px; color: #666;"><strong>Инструктор:</strong> ${instructorName}</p>`
                  : ''
              }
              ${
                studentName
                  ? `<p style="margin: 0 0 10px; font-size: 14px; color: #666;"><strong>Ученик:</strong> ${studentName}</p>`
                  : ''
              }
              ${
                penaltyType
                  ? `<p style="margin: 0 0 10px; font-size: 14px; color: #666;"><strong>Тип штрафа:</strong> ${
                      penaltyType === 'LATE_CANCEL' ? 'Поздняя отмена' : 'Неявка'
                    }</p>`
                  : ''
              }

              <!-- Кнопка действия -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                <tr>
                  <td style="background-color: #1a365d; border-radius: 6px;">
                    <a href="${actionUrl}" target="_blank" style="display: inline-block; padding: 14px 28px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px;">
                      ${actionText}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0; font-size: 12px; color: #999;">
                Или скопируйте ссылку: <a href="${actionUrl}" style="color: #1a365d; word-break: break-all;">${actionUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Футер -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #eee;">
              <p style="margin: 0 0 10px; font-size: 12px; color: #666;">
                Это автоматическое уведомление от платформы НаПрава.РФ.
              </p>
              <p style="margin: 0; font-size: 12px; color: #999;">
                Чтобы отписаться от уведомлений, перейдите в <a href="${baseUrl}/profile/settings/notifications" style="color: #1a365d;">настройки</a> вашего профиля.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()

  // Текстовая версия
  const text = `
${title}

Здравствуйте${userName ? `, ${userName}` : ''}!

${body}
${instructorName ? `\nИнструктор: ${instructorName}` : ''}${studentName ? `\nУченик: ${studentName}` : ''}${
    penaltyType ? `\nТип штрафа: ${penaltyType === 'LATE_CANCEL' ? 'Поздняя отмена' : 'Неявка'}` : ''
  }

${actionText}: ${actionUrl}

---
Это автоматическое уведомление от платформы НаПрава.РФ.
Чтобы отписаться от уведомлений, перейдите в настройки: ${baseUrl}/profile/settings/notifications
`.trim()

  return { html, text }
}

/**
 * Отправляет email-уведомление пользователю с учётом его настроек
 */
export async function sendEmailToUser(params: {
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, unknown>
  repo: EmailRepository
  emailProvider: EmailProvider
  appUrl?: string
}): Promise<SendEmailResult> {
  const { userId, type, title, body, data, repo, emailProvider, appUrl } = params

  // Получаем пользователя
  const user = await repo.getUserById(userId)
  if (!user) {
    return { success: false, error: 'USER_NOT_FOUND' }
  }

  // Проверяем наличие email
  if (!user.email) {
    return { success: true, sent: false, skipped: true, reason: 'NO_EMAIL' }
  }

  // Получаем настройки уведомлений
  const userSettings = await repo.getNotificationSettings(userId)
  const settings = userSettings ?? DEFAULT_SETTINGS

  // Проверяем, включены ли email-уведомления
  if (!settings.emailEnabled) {
    return { success: true, sent: false, skipped: true, reason: 'EMAIL_DISABLED' }
  }

  // Проверяем фильтрацию по типу уведомления
  if (!shouldSendNotification(type, settings)) {
    return { success: true, sent: false, skipped: true, reason: 'NOTIFICATION_FILTERED' }
  }

  // Формируем контент письма
  const subject = getEmailSubject(type, title)
  const { html, text } = formatEmailContent({
    type,
    title,
    body,
    userName: user.name || '',
    data,
    appUrl,
  })

  // Отправляем email
  const result = await emailProvider.sendEmail({
    to: user.email,
    subject,
    html,
    text,
  })

  if (!result.success) {
    return { success: false, error: 'EMAIL_SEND_FAILED' }
  }

  return { success: true, sent: true, messageId: result.messageId }
}
