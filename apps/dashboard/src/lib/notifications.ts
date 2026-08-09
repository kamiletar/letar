import { hostname } from 'os'
import type { Alert } from './alerts'
import { AlertSeverity } from './alerts'

/**
 * Базовый URL Telegram Bot API.
 * api.telegram.org заблокирован провайдером ДЦ на s1/s2 (хост и Docker) — проксируем через
 * `tg-proxy.letar.best` (mail сервер, NL). Тот же подход в apps/kami и apps/grandslamcup.
 * См. .claude/docs/deployment.md § «Telegram API — прокси через mail сервер».
 */
const TELEGRAM_API = process.env.TELEGRAM_API_ROOT ?? 'https://api.telegram.org'

/**
 * Получение имени сервера для уведомлений
 */
function getServerName(): string {
  // Сначала проверяем переменную окружения
  if (process.env.SERVER_NAME) {
    return process.env.SERVER_NAME
  }
  // Иначе используем hostname
  const host = hostname()
  // Упрощаем имя (s1.letar.best -> s1, server-1234 -> server-1234)
  if (host.includes('.')) {
    return host.split('.')[0]
  }
  return host
}

/**
 * Отправка уведомления в Telegram
 */
export async function sendTelegramNotification(botToken: string, chatId: string, alert: Alert): Promise<boolean> {
  try {
    const emoji = getSeverityEmoji(alert.severity)
    const message = formatTelegramMessage(alert, emoji)

    const response = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Telegram API error:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending Telegram notification:', error)
    return false
  }
}

/**
 * Форматирование сообщения для Telegram
 */
function formatTelegramMessage(alert: Alert, emoji: string): string {
  const timestamp = alert.createdAt.toLocaleString('ru-RU')
  const serverName = getServerName()

  let message = `${emoji} <b>[${serverName}] ${alert.title}</b>\n\n`
  message += `${alert.message}\n\n`
  message += `<b>Server:</b> ${serverName}\n`
  message += `<b>Severity:</b> ${alert.severity.toUpperCase()}\n`
  message += `<b>Time:</b> ${timestamp}\n`

  if (alert.metadata) {
    message += `\n<b>Details:</b>\n`
    for (const [key, value] of Object.entries(alert.metadata)) {
      message += `• ${key}: ${value}\n`
    }
  }

  return message
}

/**
 * Получение emoji для уровня серьезности
 */
function getSeverityEmoji(severity: AlertSeverity): string {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return '🔴'
    case AlertSeverity.ERROR:
      return '🟠'
    case AlertSeverity.WARNING:
      return '🟡'
    case AlertSeverity.INFO:
      return '🔵'
    default:
      return '⚪'
  }
}

/**
 * Тестирование Telegram уведомлений
 */
export async function testTelegramNotification(
  botToken: string,
  chatId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const serverName = getServerName()
    const message =
      `✅ <b>[${serverName}] Dashboard Alert Test</b>\n\nTelegram notifications are working correctly!\n\n<b>Server:</b> ${serverName}`

    const response = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return {
        success: false,
        error: `Telegram API error: ${error}`,
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Heartbeat-уведомление: подтверждает, что канал доставки жив, когда за сутки
 * не было ни одного алерта (иначе тишина неотличима от сломанного Telegram/канареечного пути).
 */
export async function sendHeartbeatTelegram(botToken: string, chatId: string): Promise<boolean> {
  try {
    const serverName = getServerName()
    const timestamp = new Date().toLocaleString('ru-RU')
    const message = `🟢 <b>[${serverName}] У всех всё хорошо</b>\n\n`
      + `За последние 24 часа не было ни одного алерта.\n\n`
      + `<b>Time:</b> ${timestamp}`

    const response = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Telegram API error (heartbeat):', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending Telegram heartbeat:', error)
    return false
  }
}

/**
 * Отправка уведомления (выбирает метод на основе настроек)
 *
 * PLAN-INFRA.md §52: раньше «отправить некуда» (Telegram выключен/не хватает токена) была
 * неотличима от «отправка провалилась» — обе тихо возвращали `false`, вызывающий код результат
 * не проверял. Алерты восемь дней копились в БД никого не разбудив, а причина молчания
 * выяснилась только ручной проверкой прод-БД. Теперь причина логируется здесь же, а не только
 * у вызывающего кода — так это видно и там, где `sendNotification()` вызван без последующей
 * проверки результата (см. `ssl-monitor.ts`).
 */
export async function sendNotification(
  alert: Alert,
  telegramEnabled: boolean,
  telegramBotToken?: string,
  telegramChatId?: string,
): Promise<boolean> {
  if (telegramEnabled && telegramBotToken && telegramChatId) {
    return await sendTelegramNotification(telegramBotToken, telegramChatId, alert)
  }

  // В будущем здесь могут быть другие методы уведомлений (Email, Webhook, etc.)
  console.warn(
    `[Notifications] Отправить некуда (alert type=${alert.type}): `
      + `telegramEnabled=${telegramEnabled}, botToken=${telegramBotToken ? 'есть' : 'нет'}, `
      + `chatId=${telegramChatId ? 'есть' : 'нет'}. Алерт создан в БД, но никуда не отправлен.`,
  )

  return false
}
