/* eslint-disable no-console */
import { sendEmail } from '../email.service'
import type { SessionReminderData } from '../email.templates'
import { getSessionReminderTemplate } from '../email.templates'

/**
 * Интерфейс для настроек уведомлений пользователя
 */
export interface UserNotificationPreferences {
  emailNotifications: boolean
  notifySessionReminders: boolean
}

/**
 * Отправить напоминание о предстоящей сессии клиенту
 * @param clientEmail Email клиента
 * @param data Данные для шаблона email
 * @param preferences Настройки уведомлений пользователя (опционально)
 */
export async function sendSessionReminderEmail(
  clientEmail: string,
  data: SessionReminderData,
  preferences?: UserNotificationPreferences
): Promise<void> {
  // Проверяем предпочтения пользователя
  if (preferences) {
    if (!preferences.emailNotifications || !preferences.notifySessionReminders) {
      console.info(`Session reminder email skipped for ${clientEmail} due to user preferences`)
      return
    }
  }

  const html = getSessionReminderTemplate(data)

  const dateStr = data.sessionDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
  })

  await sendEmail({
    to: clientEmail,
    subject: `Напоминание о сессии завтра, ${dateStr}`,
    html,
    text: `
Здравствуйте, ${data.clientName}!

Напоминаем, что завтра у вас запланирована сессия с вашим специалистом ${data.specialistName}.

Дата: ${dateStr}
Время: ${data.sessionDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
Тип сессии: ${data.sessionType}
${data.notes ? `\nЗаметки: ${data.notes}` : ''}

Перейдите в личный кабинет: ${data.dashboardUrl}

До встречи на сессии!
    `.trim(),
  })
}
