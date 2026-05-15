/**
 * Интеграционные тесты для Telegram API клиента
 *
 * Тестирует HTTP-клиент с мок-ответами от Telegram API.
 * Покрывает успешные сценарии и обработку ошибок.
 */

import {
  BotBlockedError,
  ChatNotFoundError,
  createTelegramClient,
  type HttpClient,
  RateLimitError,
  TelegramApiClient,
  TelegramApiError,
} from './telegram-api-client'

// === Мок HTTP клиент ===

function createMockHttpClient<T>(response: T): HttpClient {
  return {
    post: vi.fn().mockResolvedValue(response),
  }
}

function createMockHttpClientWithError(error: Error): HttpClient {
  return {
    post: vi.fn().mockRejectedValue(error),
  }
}

// === Тесты ===

describe('TelegramApiClient', () => {
  const botToken = 'test-bot-token-123'

  describe('constructor', () => {
    it('должен создать клиент с валидным токеном', () => {
      const client = new TelegramApiClient({ botToken })
      expect(client).toBeInstanceOf(TelegramApiClient)
    })

    it('должен выбросить ошибку без токена', () => {
      expect(() => new TelegramApiClient({ botToken: '' })).toThrow('Bot token is required')
    })
  })

  describe('getMe', () => {
    it('должен вернуть информацию о боте', async () => {
      const mockResponse = {
        ok: true,
        result: {
          id: 123456789,
          is_bot: true,
          first_name: 'TestBot',
          username: 'test_bot',
        },
      }
      const httpClient = createMockHttpClient(mockResponse)
      const client = new TelegramApiClient({ botToken, httpClient })

      const result = await client.getMe()

      expect(result).toEqual(mockResponse.result)
      expect(httpClient.post).toHaveBeenCalledWith(`https://api.telegram.org/bot${botToken}/getMe`, {})
    })

    it('должен обработать ошибку API', async () => {
      const mockResponse = {
        ok: false,
        error_code: 401,
        description: 'Unauthorized',
      }
      const httpClient = createMockHttpClient(mockResponse)
      const client = new TelegramApiClient({ botToken, httpClient })

      await expect(client.getMe()).rejects.toThrow(TelegramApiError)
    })
  })

  describe('sendMessage', () => {
    it('должен отправить простое сообщение', async () => {
      const mockResponse = {
        ok: true,
        result: {
          message_id: 1,
          chat: { id: 123, type: 'private' as const },
          date: Math.floor(Date.now() / 1000),
          text: 'Hello!',
        },
      }
      const httpClient = createMockHttpClient(mockResponse)
      const client = new TelegramApiClient({ botToken, httpClient })

      const result = await client.sendMessage({
        chat_id: 123,
        text: 'Hello!',
      })

      expect(result).toEqual(mockResponse.result)
      expect(httpClient.post).toHaveBeenCalledWith(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: 123,
        text: 'Hello!',
      })
    })

    it('должен отправить сообщение с HTML форматированием', async () => {
      const mockResponse = {
        ok: true,
        result: {
          message_id: 2,
          chat: { id: 123, type: 'private' as const },
          date: Math.floor(Date.now() / 1000),
          text: 'Bold text',
        },
      }
      const httpClient = createMockHttpClient(mockResponse)
      const client = new TelegramApiClient({ botToken, httpClient })

      await client.sendMessage({
        chat_id: 123,
        text: '<b>Bold text</b>',
        parse_mode: 'HTML',
      })

      expect(httpClient.post).toHaveBeenCalledWith(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: 123,
        text: '<b>Bold text</b>',
        parse_mode: 'HTML',
      })
    })

    it('должен отправить сообщение с inline-клавиатурой', async () => {
      const mockResponse = {
        ok: true,
        result: {
          message_id: 3,
          chat: { id: 123, type: 'private' as const },
          date: Math.floor(Date.now() / 1000),
          text: 'Choose option',
        },
      }
      const httpClient = createMockHttpClient(mockResponse)
      const client = new TelegramApiClient({ botToken, httpClient })

      const keyboard = {
        inline_keyboard: [
          [
            { text: 'Option 1', callback_data: 'opt1' },
            { text: 'Option 2', callback_data: 'opt2' },
          ],
        ],
      }

      await client.sendMessage({
        chat_id: 123,
        text: 'Choose option',
        reply_markup: keyboard,
      })

      expect(httpClient.post).toHaveBeenCalledWith(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: 123,
        text: 'Choose option',
        reply_markup: keyboard,
      })
    })

    it('должен обработать ошибку "бот заблокирован"', async () => {
      const mockResponse = {
        ok: false,
        error_code: 403,
        description: 'Forbidden: bot was blocked by the user',
      }
      const httpClient = createMockHttpClient(mockResponse)
      const client = new TelegramApiClient({ botToken, httpClient })

      await expect(
        client.sendMessage({
          chat_id: 123,
          text: 'Hello!',
        })
      ).rejects.toThrow(BotBlockedError)
    })

    it('должен обработать ошибку "чат не найден"', async () => {
      const mockResponse = {
        ok: false,
        error_code: 400,
        description: 'Bad Request: chat not found',
      }
      const httpClient = createMockHttpClient(mockResponse)
      const client = new TelegramApiClient({ botToken, httpClient })

      await expect(
        client.sendMessage({
          chat_id: 999999999,
          text: 'Hello!',
        })
      ).rejects.toThrow(ChatNotFoundError)
    })

    it('должен обработать rate limit с retry_after', async () => {
      const mockResponse = {
        ok: false,
        error_code: 429,
        description: 'Too Many Requests: retry after 30',
      }
      const httpClient = createMockHttpClient(mockResponse)
      const client = new TelegramApiClient({ botToken, httpClient })

      await expect(client.sendMessage({ chat_id: 123, text: 'Hello!' })).rejects.toThrow(RateLimitError)

      try {
        await client.sendMessage({ chat_id: 123, text: 'Hello!' })
      } catch (error) {
        expect((error as RateLimitError).retryAfter).toBe(30)
      }
    })

    it('должен использовать дефолтный retry_after при отсутствии в ответе', async () => {
      const mockResponse = {
        ok: false,
        error_code: 429,
        description: 'Too Many Requests',
      }
      const httpClient = createMockHttpClient(mockResponse)
      const client = new TelegramApiClient({ botToken, httpClient })

      await expect(client.sendMessage({ chat_id: 123, text: 'Hello!' })).rejects.toThrow(RateLimitError)

      try {
        await client.sendMessage({ chat_id: 123, text: 'Hello!' })
      } catch (error) {
        expect((error as RateLimitError).retryAfter).toBe(60)
      }
    })
  })

  describe('answerCallbackQuery', () => {
    it('должен ответить на callback query', async () => {
      const mockResponse = {
        ok: true,
        result: true,
      }
      const httpClient = createMockHttpClient(mockResponse)
      const client = new TelegramApiClient({ botToken, httpClient })

      const result = await client.answerCallbackQuery({
        callback_query_id: 'query123',
      })

      expect(result).toBe(true)
      expect(httpClient.post).toHaveBeenCalledWith(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        callback_query_id: 'query123',
      })
    })

    it('должен показать alert при ответе', async () => {
      const mockResponse = {
        ok: true,
        result: true,
      }
      const httpClient = createMockHttpClient(mockResponse)
      const client = new TelegramApiClient({ botToken, httpClient })

      await client.answerCallbackQuery({
        callback_query_id: 'query123',
        text: 'Action completed',
        show_alert: true,
      })

      expect(httpClient.post).toHaveBeenCalledWith(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        callback_query_id: 'query123',
        text: 'Action completed',
        show_alert: true,
      })
    })
  })

  describe('setWebhook', () => {
    it('должен установить webhook', async () => {
      const mockResponse = {
        ok: true,
        result: true,
      }
      const httpClient = createMockHttpClient(mockResponse)
      const client = new TelegramApiClient({ botToken, httpClient })

      const result = await client.setWebhook({
        url: 'https://example.com/api/telegram/webhook',
      })

      expect(result).toBe(true)
      expect(httpClient.post).toHaveBeenCalledWith(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        url: 'https://example.com/api/telegram/webhook',
      })
    })

    it('должен установить webhook с secret token', async () => {
      const mockResponse = {
        ok: true,
        result: true,
      }
      const httpClient = createMockHttpClient(mockResponse)
      const client = new TelegramApiClient({ botToken, httpClient })

      await client.setWebhook({
        url: 'https://example.com/api/telegram/webhook',
        secret_token: 'my-secret-token',
        allowed_updates: ['message', 'callback_query'],
      })

      expect(httpClient.post).toHaveBeenCalledWith(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        url: 'https://example.com/api/telegram/webhook',
        secret_token: 'my-secret-token',
        allowed_updates: ['message', 'callback_query'],
      })
    })
  })

  describe('getWebhookInfo', () => {
    it('должен получить информацию о webhook', async () => {
      const mockResponse = {
        ok: true,
        result: {
          url: 'https://example.com/api/telegram/webhook',
          has_custom_certificate: false,
          pending_update_count: 0,
        },
      }
      const httpClient = createMockHttpClient(mockResponse)
      const client = new TelegramApiClient({ botToken, httpClient })

      const result = await client.getWebhookInfo()

      expect(result).toEqual(mockResponse.result)
    })

    it('должен вернуть информацию об ошибке webhook', async () => {
      const mockResponse = {
        ok: true,
        result: {
          url: 'https://example.com/api/telegram/webhook',
          has_custom_certificate: false,
          pending_update_count: 5,
          last_error_date: 1700000000,
          last_error_message: 'Connection timeout',
        },
      }
      const httpClient = createMockHttpClient(mockResponse)
      const client = new TelegramApiClient({ botToken, httpClient })

      const result = await client.getWebhookInfo()

      expect(result.last_error_date).toBe(1700000000)
      expect(result.last_error_message).toBe('Connection timeout')
    })
  })

  describe('deleteWebhook', () => {
    it('должен удалить webhook', async () => {
      const mockResponse = {
        ok: true,
        result: true,
      }
      const httpClient = createMockHttpClient(mockResponse)
      const client = new TelegramApiClient({ botToken, httpClient })

      const result = await client.deleteWebhook()

      expect(result).toBe(true)
      expect(httpClient.post).toHaveBeenCalledWith(`https://api.telegram.org/bot${botToken}/deleteWebhook`, {})
    })
  })

  describe('обработка сетевых ошибок', () => {
    it('должен пробросить сетевую ошибку', async () => {
      const networkError = new Error('Network error')
      const httpClient = createMockHttpClientWithError(networkError)
      const client = new TelegramApiClient({ botToken, httpClient })

      await expect(client.getMe()).rejects.toThrow('Network error')
    })

    it('должен пробросить timeout ошибку', async () => {
      const timeoutError = new Error('Request timeout')
      const httpClient = createMockHttpClientWithError(timeoutError)
      const client = new TelegramApiClient({ botToken, httpClient })

      await expect(client.sendMessage({ chat_id: 123, text: 'Hello' })).rejects.toThrow('Request timeout')
    })
  })
})

describe('createTelegramClient', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('должен создать клиент из env переменной', () => {
    process.env.AUTH_TELEGRAM_BOT_TOKEN = 'env-bot-token'
    const client = createTelegramClient()
    expect(client).toBeInstanceOf(TelegramApiClient)
  })

  it('должен выбросить ошибку без env переменной', () => {
    delete process.env.AUTH_TELEGRAM_BOT_TOKEN
    expect(() => createTelegramClient()).toThrow('AUTH_TELEGRAM_BOT_TOKEN environment variable is not set')
  })

  it('должен принять кастомный httpClient', () => {
    process.env.AUTH_TELEGRAM_BOT_TOKEN = 'env-bot-token'
    const mockHttpClient = createMockHttpClient({ ok: true, result: {} })
    const client = createTelegramClient(mockHttpClient)
    expect(client).toBeInstanceOf(TelegramApiClient)
  })
})

describe('классы ошибок', () => {
  describe('TelegramApiError', () => {
    it('должен содержать код и описание', () => {
      const error = new TelegramApiError('Test error', 400, 'Bad Request')
      expect(error.name).toBe('TelegramApiError')
      expect(error.message).toBe('Test error')
      expect(error.code).toBe(400)
      expect(error.description).toBe('Bad Request')
    })
  })

  describe('BotBlockedError', () => {
    it('должен иметь правильные значения', () => {
      const error = new BotBlockedError()
      expect(error.name).toBe('BotBlockedError')
      expect(error.code).toBe(403)
      expect(error.message).toBe('Bot was blocked by user')
    })
  })

  describe('ChatNotFoundError', () => {
    it('должен иметь правильные значения', () => {
      const error = new ChatNotFoundError()
      expect(error.name).toBe('ChatNotFoundError')
      expect(error.code).toBe(400)
      expect(error.message).toBe('Chat not found')
    })
  })

  describe('RateLimitError', () => {
    it('должен содержать retryAfter', () => {
      const error = new RateLimitError(45)
      expect(error.name).toBe('RateLimitError')
      expect(error.code).toBe(429)
      expect(error.retryAfter).toBe(45)
      expect(error.message).toBe('Rate limited. Retry after 45 seconds')
    })
  })
})
