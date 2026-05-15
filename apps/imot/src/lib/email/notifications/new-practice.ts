/* eslint-disable no-console */
import { sendEmail } from '../email.service'
import type { NewPracticeData } from '../email.templates'
import { getNewPracticeTemplate } from '../email.templates'

/**
 * Интерфейс для настроек уведомлений пользователя
 */
export interface UserNotificationPreferences {
  emailNotifications: boolean
  notifyNewPractices: boolean
}

/**
 * Отправить уведомление о новой практике клиенту
 * @param clientEmail Email клиента
 * @param data Данные для шаблона email
 * @param preferences Настройки уведомлений пользователя (опционально)
 */
export async function sendNewPracticeEmail(
  clientEmail: string,
  data: NewPracticeData,
  preferences?: UserNotificationPreferences
): Promise<void> {
  // Проверяем предпочтения пользователя
  if (preferences) {
    if (!preferences.emailNotifications || !preferences.notifyNewPractices) {
      console.info(`New practice email skipped for ${clientEmail} due to user preferences`)
      return
    }
  }

  const html = getNewPracticeTemplate(data)

  await sendEmail({
    to: clientEmail,
    subject: `Новая практика: ${data.practiceName}`,
    html,
    text: `
Здравствуйте, ${data.clientName}!

Ваш специалист назначил вам новую практику для работы на уровне ${data.practiceLevel}.

${data.practiceName}
${data.practiceDescription}

Длительность: ${data.duration}
Частота: ${data.frequency}

Регулярное выполнение практик — ключ к устойчивым изменениям. Помните о дневнике практик — записывайте свои наблюдения и ощущения.

Перейти к практикам: ${data.practicesUrl}

Желаем вам вдохновения и прогресса!
    `.trim(),
  })
}
