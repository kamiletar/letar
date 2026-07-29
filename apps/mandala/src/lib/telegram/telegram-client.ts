/**
 * HTTP-клиент для Telegram Bot API
 * Упрощённая версия — только отправка сообщений
 */

export interface SendMessageParams {
  chatId: string
  text: string
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
}

export interface TelegramApiResponse<T> {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
}

export class TelegramClientError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly description?: string
  ) {
    super(message)
    this.name = 'TelegramClientError'
  }
}

export class TelegramClient {
  private readonly baseUrl: string

  constructor(botToken: string) {
    if (!botToken) {
      throw new Error('Bot token is required')
    }
    // На s1/s2 api.telegram.org заблокирован провайдером ДЦ — обход через tg-proxy.letar.best
    const telegramApiRoot = process.env.TELEGRAM_API_ROOT ?? 'https://api.telegram.org'
    this.baseUrl = `${telegramApiRoot}/bot${botToken}`
  }

  /**
   * Отправить сообщение
   */
  async sendMessage(params: SendMessageParams): Promise<{ messageId: number }> {
    const response = await fetch(`${this.baseUrl}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: params.chatId,
        text: params.text,
        parse_mode: params.parseMode ?? 'HTML',
      }),
    })

    const data: TelegramApiResponse<{ message_id: number }> = await response.json()

    if (!data.ok || !data.result) {
      throw new TelegramClientError(data.description ?? 'Unknown Telegram API error', data.error_code, data.description)
    }

    return { messageId: data.result.message_id }
  }

  /**
   * Проверить валидность токена (getMe)
   */
  async validateToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/getMe`, { method: 'POST' })
      const data: TelegramApiResponse<unknown> = await response.json()
      return data.ok === true
    } catch {
      return false
    }
  }
}
