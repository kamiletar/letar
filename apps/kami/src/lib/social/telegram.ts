import type { BlogPostData, PublishResult, TelegramConfig } from './types'

/** Базовый URL Telegram Bot API */
const TELEGRAM_API = 'https://api.telegram.org'

/**
 * Форматирование поста для Telegram (HTML разметка)
 */
function formatMessage(post: BlogPostData): string {
  const tags = post.tags.map((t) => `#${t.replace(/\s+/g, '_')}`).join(' ')

  return [
    `<b>${escapeHtml(post.title)}</b>`,
    '',
    escapeHtml(post.description),
    '',
    `🔗 <a href="${post.url}">Читать на сайте</a>`,
    tags ? `\n${tags}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Экранирование HTML для Telegram */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Публикация блог-поста в Telegram канал/группу.
 * Использует прокси (tg-proxy.letar.best) для обхода блокировки из РФ.
 */
export async function publishToTelegram(config: TelegramConfig, post: BlogPostData): Promise<PublishResult> {
  const baseUrl = config.proxyUrl ? `https://${config.proxyUrl}` : TELEGRAM_API
  const url = `${baseUrl}/bot${config.botToken}/sendMessage`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: formatMessage(post),
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    })

    const data = await response.json()

    if (!data.ok) {
      return {
        success: false,
        error: `Telegram API: ${data.description || 'Unknown error'}`,
      }
    }

    const messageId = data.result?.message_id
    // Формируем URL на сообщение (для публичных каналов)
    const chatIdStr = String(config.chatId)
    const channelName = chatIdStr.startsWith('@') ? chatIdStr.slice(1) : null
    const externalUrl = channelName && messageId ? `https://t.me/${channelName}/${messageId}` : undefined

    return {
      success: true,
      externalId: String(messageId),
      externalUrl,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка Telegram',
    }
  }
}
