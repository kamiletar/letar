import { hostname } from 'os'
import type { Alert } from './alerts'
import { AlertSeverity } from './alerts'

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

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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
  chatId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const serverName = getServerName()
    const message = `✅ <b>[${serverName}] Dashboard Alert Test</b>\n\nTelegram notifications are working correctly!\n\n<b>Server:</b> ${serverName}`

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
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
 * Отправка уведомления (выбирает метод на основе настроек)
 */
export async function sendNotification(
  alert: Alert,
  telegramEnabled: boolean,
  telegramBotToken?: string,
  telegramChatId?: string
): Promise<boolean> {
  if (telegramEnabled && telegramBotToken && telegramChatId) {
    return await sendTelegramNotification(telegramBotToken, telegramChatId, alert)
  }

  // В будущем здесь могут быть другие методы уведомлений (Email, Webhook, etc.)

  return false
}
