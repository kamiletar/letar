/* eslint-disable no-console */
import { sendEmail } from '../email.service'
import type { PracticeDiaryReminderData } from '../email.templates'
import { getPracticeDiaryReminderTemplate } from '../email.templates'

/**
 * Интерфейс для настроек уведомлений пользователя
 */
export interface UserNotificationPreferences {
  emailNotifications: boolean
  notifyPracticeDiary: boolean
}

/**
 * Отправить напоминание о заполнении дневника практик
 * @param clientEmail Email клиента
 * @param data Данные для шаблона email
 * @param preferences Настройки уведомлений пользователя (опционально)
 */
export async function sendPracticeDiaryReminderEmail(
  clientEmail: string,
  data: PracticeDiaryReminderData,
  preferences?: UserNotificationPreferences
): Promise<void> {
  // Проверяем предпочтения пользователя
  if (preferences) {
    if (!preferences.emailNotifications || !preferences.notifyPracticeDiary) {
      console.info(`Practice diary reminder email skipped for ${clientEmail} due to user preferences`)
      return
    }
  }

  const html = getPracticeDiaryReminderTemplate(data)

  await sendEmail({
    to: clientEmail,
    subject: 'Напоминание: заполните дневник практик 📝',
    html,
    text: `
Здравствуйте, ${data.clientName}!

${
  data.lastEntryDate
    ? `Последняя запись в дневнике была ${data.lastEntryDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
      })}.`
    : 'Мы заметили, что у вас пока нет записей в дневнике.'
}

Ведение дневника практик помогает отслеживать прогресс, замечать паттерны и углублять осознанность.

У вас ${data.incompletePracticesCount} практик${
      data.incompletePracticesCount === 1 ? 'а' : data.incompletePracticesCount < 5 ? 'и' : ''
    } ожидает${data.incompletePracticesCount === 1 ? '' : 'ют'} ваших заметок.

Что стоит записать:
- Какие ощущения возникли во время практики?
- Что далось легко, а что вызвало сопротивление?
- Какие инсайты или осознания пришли?
- Изменения в самочувствии или состоянии

Перейти к практикам: ${data.practicesUrl}

Ваш путь трансформации важен!
    `.trim(),
  })
}
