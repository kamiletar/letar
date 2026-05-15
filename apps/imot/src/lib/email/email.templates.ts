/**
 * HTML шаблоны для email уведомлений IMOT
 */

/**
 * Базовый HTML layout для всех email
 */
function getEmailLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>IMOT</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      color: #ffffff;
      font-size: 32px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
      line-height: 1.6;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: #CA9E67;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      padding: 30px;
      text-align: center;
      color: #888888;
      font-size: 14px;
      border-top: 1px solid #eeeeee;
    }
    .divider {
      height: 1px;
      background-color: #eeeeee;
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌟 ИМОТ</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Интегративная Матрица Осознанной Трансформации</p>
      <p style="font-size: 12px; color: #aaaaaa;">
        Это автоматическое уведомление. Пожалуйста, не отвечайте на это письмо.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

/**
 * Напоминание о предстоящей сессии
 */
export interface SessionReminderData {
  clientName: string
  specialistName: string
  sessionDate: Date
  sessionType: string
  notes?: string
  meetingUrl?: string
  dashboardUrl: string
}

export function getSessionReminderTemplate(data: SessionReminderData): string {
  const dateStr = data.sessionDate.toLocaleDateString('ru-RU', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const timeStr = data.sessionDate.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const content = `
    <h2 style="color: #667eea; margin-top: 0;">Напоминание о сессии</h2>
    <p>Здравствуйте, <strong>${data.clientName}</strong>!</p>
    <p>Напоминаем, что завтра у вас запланирована сессия с вашим специалистом <strong>${data.specialistName}</strong>.</p>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>📅 Дата:</strong> ${dateStr}</p>
      <p style="margin: 0 0 10px 0;"><strong>🕐 Время:</strong> ${timeStr}</p>
      <p style="margin: 0 0 10px 0;"><strong>📋 Тип сессии:</strong> ${data.sessionType}</p>
      ${
        data.meetingUrl
          ? `<p style="margin: 0 0 10px 0;"><strong>🎥 Видео-звонок:</strong> <a href="${data.meetingUrl}" style="color: #667eea;">${data.meetingUrl}</a></p>`
          : ''
      }
      ${
        data.notes
          ? `<div class="divider"></div><p style="margin: 0;"><strong>Заметки:</strong><br>${data.notes}</p>`
          : ''
      }
    </div>

    <p>Подготовьтесь к сессии, просмотрев свои профили и текущие практики.</p>

    <div style="text-align: center;">
      ${
        data.meetingUrl
          ? `<a href="${data.meetingUrl}" class="button" style="background-color: #667eea; margin-right: 10px;">Присоединиться к звонку</a>`
          : ''
      }
      <a href="${data.dashboardUrl}" class="button">Перейти в личный кабинет</a>
    </div>

    <p style="color: #888888; font-size: 14px; margin-top: 30px;">
      До встречи на сессии! 🌟
    </p>
  `

  return getEmailLayout(content)
}

/**
 * Уведомление о новой практике
 */
export interface NewPracticeData {
  clientName: string
  practiceName: string
  practiceDescription: string
  practiceLevel: string
  duration: string
  frequency: string
  practicesUrl: string
}

export function getNewPracticeTemplate(data: NewPracticeData): string {
  const levelEmojis: Record<string, string> = {
    Нумерология: '🔢',
    Нейропсихология: '🧠',
    Энергетика: '✨',
    Тело: '🧘',
    Стиль: '💎',
  }

  const emoji = levelEmojis[data.practiceLevel] || '⭐'

  const content = `
    <h2 style="color: #667eea; margin-top: 0;">Новая практика назначена!</h2>
    <p>Здравствуйте, <strong>${data.clientName}</strong>!</p>
    <p>Ваш специалист назначил вам новую практику для работы на уровне <strong>${data.practiceLevel}</strong>.</p>

    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 12px; margin: 25px 0; color: white;">
      <h3 style="margin: 0 0 15px 0; font-size: 24px;">${emoji} ${data.practiceName}</h3>
      <p style="margin: 0; opacity: 0.95;">${data.practiceDescription}</p>
    </div>

    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>⏱️ Длительность:</strong> ${data.duration}</p>
      <p style="margin: 0;"><strong>🔄 Частота:</strong> ${data.frequency}</p>
    </div>

    <p>Регулярное выполнение практик — ключ к устойчивым изменениям. Помните о дневнике практик — записывайте свои наблюдения и ощущения.</p>

    <div style="text-align: center;">
      <a href="${data.practicesUrl}" class="button">Перейти к практикам</a>
    </div>

    <p style="color: #888888; font-size: 14px; margin-top: 30px;">
      Желаем вам вдохновения и прогресса! 💫
    </p>
  `

  return getEmailLayout(content)
}

/**
 * Напоминание о заполнении дневника практик
 */
export interface PracticeDiaryReminderData {
  clientName: string
  incompletePracticesCount: number
  lastEntryDate?: Date
  practicesUrl: string
}

export function getPracticeDiaryReminderTemplate(data: PracticeDiaryReminderData): string {
  const lastEntryText = data.lastEntryDate
    ? `Последняя запись была ${data.lastEntryDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
      })}.`
    : 'Мы заметили, что у вас пока нет записей в дневнике.'

  const content = `
    <h2 style="color: #667eea; margin-top: 0;">Время для рефлексии 📝</h2>
    <p>Здравствуйте, <strong>${data.clientName}</strong>!</p>
    <p>${lastEntryText}</p>

    <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; border-radius: 4px; margin: 20px 0;">
      <p style="margin: 0; color: #856404;">
        <strong>💡 Совет:</strong> Ведение дневника практик помогает отслеживать прогресс, замечать паттерны и углублять осознанность. Даже короткие записи имеют большую ценность!
      </p>
    </div>

    <p>У вас <strong>${data.incompletePracticesCount}</strong> практик${
      data.incompletePracticesCount === 1 ? 'а' : data.incompletePracticesCount < 5 ? 'и' : ''
    } ожидает${data.incompletePracticesCount === 1 ? '' : 'ют'} ваших заметок.</p>

    <p><strong>Что стоит записать:</strong></p>
    <ul style="color: #555555;">
      <li>Какие ощущения возникли во время практики?</li>
      <li>Что далось легко, а что вызвало сопротивление?</li>
      <li>Какие инсайты или осознания пришли?</li>
      <li>Изменения в самочувствии или состоянии</li>
    </ul>

    <div style="text-align: center;">
      <a href="${data.practicesUrl}" class="button">Заполнить дневник</a>
    </div>

    <p style="color: #888888; font-size: 14px; margin-top: 30px;">
      Ваш путь трансформации важен! 🌱
    </p>
  `

  return getEmailLayout(content)
}
