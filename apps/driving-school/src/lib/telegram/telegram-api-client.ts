/**
 * HTTP-клиент для Telegram Bot API
 *
 * Обёртка над fetch для взаимодействия с Telegram Bot API.
 * Используется для отправки сообщений и получения информации о боте.
 */

// === Типы Telegram API ===

export interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface TelegramChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
  username?: string
  first_name?: string
  last_name?: string
}

export interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  date: number
  text?: string
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

export interface TelegramCallbackQuery {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  chat_instance: string
  data?: string
}

export interface InlineKeyboardButton {
  text: string
  callback_data?: string
  url?: string
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][]
}

export interface SendMessageParams {
  chat_id: number | string
  text: string
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  reply_markup?: InlineKeyboardMarkup
}

export interface TelegramApiResponse<T> {
  ok: boolean
  result?: T
  description?: string
  error_code?: number
}

// === Ошибки ===

export class TelegramApiError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
    public readonly description?: string
  ) {
    super(message)
    this.name = 'TelegramApiError'
  }
}

export class BotBlockedError extends TelegramApiError {
  constructor() {
    super('Bot was blocked by user', 403, 'Forbidden: bot was blocked by the user')
    this.name = 'BotBlockedError'
  }
}

export class ChatNotFoundError extends TelegramApiError {
  constructor() {
    super('Chat not found', 400, 'Bad Request: chat not found')
    this.name = 'ChatNotFoundError'
  }
}

export class RateLimitError extends TelegramApiError {
  constructor(public readonly retryAfter: number) {
    super(`Rate limited. Retry after ${retryAfter} seconds`, 429, 'Too Many Requests')
    this.name = 'RateLimitError'
  }
}

// === HTTP клиент (для тестирования) ===

export interface HttpClient {
  post<T>(url: string, body: unknown): Promise<T>
}

export const defaultHttpClient: HttpClient = {
  async post<T>(url: string, body: unknown): Promise<T> {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return response.json() as Promise<T>
  },
}

// === Telegram API клиент ===

export interface TelegramApiClientConfig {
  botToken: string
  httpClient?: HttpClient
}

export class TelegramApiClient {
  private readonly baseUrl: string
  private readonly httpClient: HttpClient

  constructor(config: TelegramApiClientConfig) {
    if (!config.botToken) {
      throw new Error('Bot token is required')
    }
    this.baseUrl = `https://api.telegram.org/bot${config.botToken}`
    this.httpClient = config.httpClient ?? defaultHttpClient
  }

  /**
   * Получить информацию о боте
   */
  async getMe(): Promise<TelegramUser> {
    const response = await this.httpClient.post<TelegramApiResponse<TelegramUser>>(`${this.baseUrl}/getMe`, {})
    return this.handleResponse(response)
  }

  /**
   * Отправить сообщение
   */
  async sendMessage(params: SendMessageParams): Promise<TelegramMessage> {
    const response = await this.httpClient.post<TelegramApiResponse<TelegramMessage>>(
      `${this.baseUrl}/sendMessage`,
      params
    )
    return this.handleResponse(response)
  }

  /**
   * Ответить на callback query (inline-кнопки)
   */
  async answerCallbackQuery(params: {
    callback_query_id: string
    text?: string
    show_alert?: boolean
  }): Promise<boolean> {
    const response = await this.httpClient.post<TelegramApiResponse<boolean>>(
      `${this.baseUrl}/answerCallbackQuery`,
      params
    )
    return this.handleResponse(response)
  }

  /**
   * Установить webhook
   */
  async setWebhook(params: { url: string; secret_token?: string; allowed_updates?: string[] }): Promise<boolean> {
    const response = await this.httpClient.post<TelegramApiResponse<boolean>>(`${this.baseUrl}/setWebhook`, params)
    return this.handleResponse(response)
  }

  /**
   * Получить информацию о webhook
   */
  async getWebhookInfo(): Promise<{
    url: string
    has_custom_certificate: boolean
    pending_update_count: number
    last_error_date?: number
    last_error_message?: string
  }> {
    const response = await this.httpClient.post<
      TelegramApiResponse<{
        url: string
        has_custom_certificate: boolean
        pending_update_count: number
        last_error_date?: number
        last_error_message?: string
      }>
    >(`${this.baseUrl}/getWebhookInfo`, {})
    return this.handleResponse(response)
  }

  /**
   * Удалить webhook
   */
  async deleteWebhook(): Promise<boolean> {
    const response = await this.httpClient.post<TelegramApiResponse<boolean>>(`${this.baseUrl}/deleteWebhook`, {})
    return this.handleResponse(response)
  }

  /**
   * Обработать ответ Telegram API
   */
  private handleResponse<T>(response: TelegramApiResponse<T>): T {
    if (response.ok && response.result !== undefined) {
      return response.result
    }

    // Обработка специфичных ошибок
    const errorDesc = response.description ?? 'Unknown error'
    const errorCode = response.error_code

    if (errorDesc.includes('blocked')) {
      throw new BotBlockedError()
    }

    if (errorDesc.includes('chat not found')) {
      throw new ChatNotFoundError()
    }

    if (errorCode === 429) {
      // Извлекаем retry_after из описания если есть
      const retryMatch = errorDesc.match(/retry after (\d+)/)
      const retryAfter = retryMatch ? parseInt(retryMatch[1], 10) : 60
      throw new RateLimitError(retryAfter)
    }

    throw new TelegramApiError(errorDesc, errorCode, errorDesc)
  }
}

// === Функция создания клиента из env ===

export function createTelegramClient(httpClient?: HttpClient): TelegramApiClient {
  const botToken = process.env.AUTH_TELEGRAM_BOT_TOKEN
  if (!botToken) {
    throw new Error('AUTH_TELEGRAM_BOT_TOKEN environment variable is not set')
  }
  return new TelegramApiClient({ botToken, httpClient })
}
