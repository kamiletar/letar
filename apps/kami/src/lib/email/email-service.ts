/**
 * Email сервис для бизнес-уведомлений Kami
 *
 * Для auth-писем (верификация, magic link, приглашения)
 * используй @letar/email напрямую в lib/auth.ts
 *
 * Этот модуль содержит только бизнес-специфичные уведомления:
 * - sendHireRequestNotification - заявки на работу
 * - sendConsultingRequestNotification - заявки на консультацию
 */

import { createEmailProvider, getConfigFromEnv } from '@letar/email'

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

// === Hire Request Email ===

export interface HireRequestEmailData {
  companyName: string
  companyWebsite?: string
  companySize?: string
  industry?: string
  teamSize?: string
  teamStructure?: string
  remoteFriendly: boolean
  techStack: string[]
  projectType?: string
  employmentType?: string
  location?: string
  timezone?: string
  salaryRange?: string
  benefits?: string
  hiringProcess?: string
  startDate?: string
  contactName: string
  contactEmail: string
  contactTelegram?: string
  message?: string
}

/**
 * Форматирует HTML и текстовый контент для уведомления о новой заявке на работу
 */
function formatHireRequestEmailContent(data: HireRequestEmailData): { html: string; text: string } {
  const baseUrl = process.env.BETTER_AUTH_URL || 'https://kami.lol'

  // Функция для форматирования поля
  const field = (label: string, value: string | undefined | null) =>
    value
      ? `<tr><td style="padding: 8px 0; color: #666; width: 40%;">${label}:</td><td style="padding: 8px 0; font-weight: 500;">${value}</td></tr>`
      : ''

  const fieldText = (label: string, value: string | undefined | null) => (value ? `${label}: ${value}` : '')

  // HTML шаблон
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Новая заявка на работу</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Шапка -->
          <tr>
            <td style="background-color: #38a169; padding: 30px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                💼 Новая заявка на работу
              </h1>
            </td>
          </tr>

          <!-- Контент -->
          <tr>
            <td style="padding: 30px;">
              <!-- Компания -->
              <h2 style="margin: 0 0 15px; font-size: 18px; color: #2d3748; border-bottom: 2px solid #38a169; padding-bottom: 8px;">
                🏢 О компании
              </h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                ${field('Компания', data.companyName)}
                ${
    field(
      'Сайт',
      data.companyWebsite
        ? `<a href="${data.companyWebsite}" style="color: #3182ce;">${data.companyWebsite}</a>`
        : undefined,
    )
  }
                ${field('Размер', data.companySize)}
                ${field('Индустрия', data.industry)}
              </table>

              <!-- Команда -->
              <h2 style="margin: 0 0 15px; font-size: 18px; color: #2d3748; border-bottom: 2px solid #38a169; padding-bottom: 8px;">
                👥 Команда
              </h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                ${field('Размер команды', data.teamSize)}
                ${field('Структура', data.teamStructure)}
                ${field('Удалёнка', data.remoteFriendly ? '✅ Да' : '❌ Нет')}
              </table>

              <!-- Стек -->
              <h2 style="margin: 0 0 15px; font-size: 18px; color: #2d3748; border-bottom: 2px solid #38a169; padding-bottom: 8px;">
                💻 Технический стек
              </h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                ${field('Технологии', data.techStack.length > 0 ? data.techStack.join(', ') : undefined)}
                ${field('Тип проекта', data.projectType)}
              </table>

              <!-- Условия -->
              <h2 style="margin: 0 0 15px; font-size: 18px; color: #2d3748; border-bottom: 2px solid #38a169; padding-bottom: 8px;">
                📋 Условия
              </h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                ${field('Формат', data.employmentType)}
                ${field('Локация', data.location)}
                ${field('Часовой пояс', data.timezone)}
              </table>

              <!-- Компенсация -->
              <h2 style="margin: 0 0 15px; font-size: 18px; color: #2d3748; border-bottom: 2px solid #38a169; padding-bottom: 8px;">
                💰 Компенсация
              </h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                ${field('Зарплата', data.salaryRange)}
                ${field('Бенефиты', data.benefits)}
              </table>

              <!-- Процесс -->
              <h2 style="margin: 0 0 15px; font-size: 18px; color: #2d3748; border-bottom: 2px solid #38a169; padding-bottom: 8px;">
                📅 Процесс
              </h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                ${field('Этапы', data.hiringProcess)}
                ${field('Дата старта', data.startDate)}
              </table>

              <!-- Контакты -->
              <h2 style="margin: 0 0 15px; font-size: 18px; color: #2d3748; border-bottom: 2px solid #38a169; padding-bottom: 8px;">
                📬 Контакты
              </h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                ${field('Имя', data.contactName)}
                ${
    field(
      'Email',
      `<a href="mailto:${data.contactEmail}" style="color: #3182ce;">${data.contactEmail}</a>`,
    )
  }
                ${
    field(
      'Telegram',
      data.contactTelegram
        ? `<a href="https://t.me/${
          data.contactTelegram.replace(
            '@',
            '',
          )
        }" style="color: #3182ce;">${data.contactTelegram}</a>`
        : undefined,
    )
  }
              </table>

              <!-- Сообщение -->
              ${
    data.message
      ? `
              <h2 style="margin: 0 0 15px; font-size: 18px; color: #2d3748; border-bottom: 2px solid #38a169; padding-bottom: 8px;">
                💬 Сообщение
              </h2>
              <p style="margin: 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px; white-space: pre-wrap;">${data.message}</p>
              `
      : ''
  }
            </td>
          </tr>

          <!-- Футер -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                Заявка отправлена с <a href="${baseUrl}" style="color: #3182ce;">Kami</a>.
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
  const sections = [
    '💼 НОВАЯ ЗАЯВКА НА РАБОТУ',
    '',
    '🏢 О КОМПАНИИ',
    fieldText('Компания', data.companyName),
    fieldText('Сайт', data.companyWebsite),
    fieldText('Размер', data.companySize),
    fieldText('Индустрия', data.industry),
    '',
    '👥 КОМАНДА',
    fieldText('Размер команды', data.teamSize),
    fieldText('Структура', data.teamStructure),
    `Удалёнка: ${data.remoteFriendly ? 'Да' : 'Нет'}`,
    '',
    '💻 ТЕХНИЧЕСКИЙ СТЕК',
    fieldText('Технологии', data.techStack.length > 0 ? data.techStack.join(', ') : undefined),
    fieldText('Тип проекта', data.projectType),
    '',
    '📋 УСЛОВИЯ',
    fieldText('Формат', data.employmentType),
    fieldText('Локация', data.location),
    fieldText('Часовой пояс', data.timezone),
    '',
    '💰 КОМПЕНСАЦИЯ',
    fieldText('Зарплата', data.salaryRange),
    fieldText('Бенефиты', data.benefits),
    '',
    '📅 ПРОЦЕСС',
    fieldText('Этапы', data.hiringProcess),
    fieldText('Дата старта', data.startDate),
    '',
    '📬 КОНТАКТЫ',
    fieldText('Имя', data.contactName),
    fieldText('Email', data.contactEmail),
    fieldText('Telegram', data.contactTelegram),
    '',
    data.message ? `💬 СООБЩЕНИЕ\n${data.message}` : '',
    '',
    '---',
    `Заявка отправлена с ${baseUrl}`,
  ]

  const text = sections.filter(Boolean).join('\n').trim()

  return { html, text }
}

/**
 * Отправляет уведомление о новой заявке на работу
 */
export async function sendHireRequestNotification(
  data: HireRequestEmailData,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Email получателя (владелец сайта)
  const notifyTo = process.env.HIRE_NOTIFY_EMAIL || process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
  if (!notifyTo) {
    console.error('[Email] No recipient configured for hire notifications')
    return { success: false, error: 'No recipient configured' }
  }

  const { html, text } = formatHireRequestEmailContent(data)
  const provider = getProvider()

  return provider.sendEmail({
    to: notifyTo,
    subject: `💼 Новая заявка на работу от ${data.companyName}`,
    html,
    text,
  })
}

// === Consulting Request Email ===

export interface ConsultingRequestEmailData {
  name: string
  email: string
  telegram?: string
  company?: string
  serviceType?: string
  projectType?: string
  description: string
  budget?: string
  timeline?: string
  preferredTime?: string // ISO string с выбранным слотом
}

/**
 * Форматирует HTML и текстовый контент для уведомления о заявке на консультацию
 */
function formatConsultingRequestEmailContent(data: ConsultingRequestEmailData): { html: string; text: string } {
  const baseUrl = process.env.BETTER_AUTH_URL || 'https://kami.lol'

  // Маппинг типов услуг
  const serviceTypeLabels: Record<string, string> = {
    architecture: '🏗️ Архитектура',
    'code-review': '🔍 Код-ревью',
    audit: '📊 Технический аудит',
    mentoring: '👨‍🏫 Менторинг',
  }

  // Маппинг типов проектов
  const projectTypeLabels: Record<string, string> = {
    web: '🌐 Web-приложение',
    mobile: '📱 Мобильное приложение',
    desktop: '💻 Desktop-приложение',
    other: '📦 Другое',
  }

  // Маппинг бюджета
  const budgetLabels: Record<string, string> = {
    'under-1k': 'До $1,000',
    '1k-5k': '$1,000 - $5,000',
    '5k-10k': '$5,000 - $10,000',
    'over-10k': 'Более $10,000',
    discuss: 'Обсудим',
  }

  // Маппинг сроков
  const timelineLabels: Record<string, string> = {
    asap: '🚀 Как можно скорее',
    '1-week': '📅 В течение недели',
    '1-month': '📆 В течение месяца',
    flexible: '🔄 Гибкие сроки',
  }

  // Функция для форматирования поля
  const field = (label: string, value: string | undefined | null) =>
    value
      ? `<tr><td style="padding: 8px 0; color: #666; width: 35%;">${label}:</td><td style="padding: 8px 0; font-weight: 500;">${value}</td></tr>`
      : ''

  const fieldText = (label: string, value: string | undefined | null) => (value ? `${label}: ${value}` : '')

  // HTML шаблон
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Новая заявка на консультацию</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Шапка -->
          <tr>
            <td style="background-color: #805ad5; padding: 30px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                🎯 Новая заявка на консультацию
              </h1>
            </td>
          </tr>

          <!-- Контент -->
          <tr>
            <td style="padding: 30px;">
              <!-- Контактные данные -->
              <h2 style="margin: 0 0 15px; font-size: 18px; color: #2d3748; border-bottom: 2px solid #805ad5; padding-bottom: 8px;">
                👤 Контактные данные
              </h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                ${field('Имя', data.name)}
                ${field('Email', `<a href="mailto:${data.email}" style="color: #805ad5;">${data.email}</a>`)}
                ${
    field(
      'Telegram',
      data.telegram
        ? `<a href="https://t.me/${data.telegram.replace('@', '')}" style="color: #805ad5;">${data.telegram}</a>`
        : undefined,
    )
  }
                ${field('Компания', data.company)}
              </table>

              <!-- Детали проекта -->
              <h2 style="margin: 0 0 15px; font-size: 18px; color: #2d3748; border-bottom: 2px solid #805ad5; padding-bottom: 8px;">
                📋 Детали проекта
              </h2>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 25px;">
                ${
    field(
      'Тип услуги',
      data.serviceType ? serviceTypeLabels[data.serviceType] || data.serviceType : undefined,
    )
  }
                ${
    field(
      'Тип проекта',
      data.projectType ? projectTypeLabels[data.projectType] || data.projectType : undefined,
    )
  }
                ${field('Бюджет', data.budget ? budgetLabels[data.budget] || data.budget : undefined)}
                ${field('Сроки', data.timeline ? timelineLabels[data.timeline] || data.timeline : undefined)}
                ${
    field(
      '🗓️ Предпочтительное время',
      data.preferredTime
        ? new Date(data.preferredTime).toLocaleString('ru-RU', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        })
        : undefined,
    )
  }
              </table>

              <!-- Описание задачи -->
              <h2 style="margin: 0 0 15px; font-size: 18px; color: #2d3748; border-bottom: 2px solid #805ad5; padding-bottom: 8px;">
                📝 Описание задачи
              </h2>
              <p style="margin: 0; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border-left: 4px solid #805ad5; white-space: pre-wrap;">${data.description}</p>
            </td>
          </tr>

          <!-- Футер -->
          <tr>
            <td style="padding: 20px 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                Заявка отправлена с <a href="${baseUrl}/consulting" style="color: #805ad5;">Kami Consulting</a>.
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
  const sections = [
    '🎯 НОВАЯ ЗАЯВКА НА КОНСУЛЬТАЦИЮ',
    '',
    '👤 КОНТАКТНЫЕ ДАННЫЕ',
    fieldText('Имя', data.name),
    fieldText('Email', data.email),
    fieldText('Telegram', data.telegram),
    fieldText('Компания', data.company),
    '',
    '📋 ДЕТАЛИ ПРОЕКТА',
    fieldText('Тип услуги', data.serviceType ? serviceTypeLabels[data.serviceType] || data.serviceType : undefined),
    fieldText('Тип проекта', data.projectType ? projectTypeLabels[data.projectType] || data.projectType : undefined),
    fieldText('Бюджет', data.budget ? budgetLabels[data.budget] || data.budget : undefined),
    fieldText('Сроки', data.timeline ? timelineLabels[data.timeline] || data.timeline : undefined),
    fieldText(
      '🗓️ Предпочтительное время',
      data.preferredTime
        ? new Date(data.preferredTime).toLocaleString('ru-RU', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        })
        : undefined,
    ),
    '',
    '📝 ОПИСАНИЕ ЗАДАЧИ',
    data.description,
    '',
    '---',
    `Заявка отправлена с ${baseUrl}/consulting`,
  ]

  const text = sections.filter(Boolean).join('\n').trim()

  return { html, text }
}

/**
 * Отправляет уведомление о новой заявке на консультацию
 */
export async function sendConsultingRequestNotification(
  data: ConsultingRequestEmailData,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Email получателя (владелец сайта)
  const notifyTo = process.env.CONSULTING_NOTIFY_EMAIL
    || process.env.HIRE_NOTIFY_EMAIL
    || process.env.SMTP_FROM_EMAIL
    || process.env.SMTP_USER
  if (!notifyTo) {
    console.error('[Email] No recipient configured for consulting notifications')
    return { success: false, error: 'No recipient configured' }
  }

  const { html, text } = formatConsultingRequestEmailContent(data)
  const provider = getProvider()

  return provider.sendEmail({
    to: notifyTo,
    subject: `🎯 Новая заявка на консультацию от ${data.name}`,
    html,
    text,
  })
}
