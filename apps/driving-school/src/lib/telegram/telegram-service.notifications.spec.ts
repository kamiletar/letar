/**
 * Тесты для отправки уведомлений через Telegram
 *
 * Покрывает:
 * - Отправка уведомлений (sendTelegramNotification)
 * - Уведомления по userId (notifyUserViaTelegram)
 */

import { notifyUserViaTelegram, sendTelegramNotification } from './telegram-service'
import { createMockRepo, mockTelegramLink } from './telegram-service.mocks'

describe('sendTelegramNotification', () => {
  it('должен отправить сообщение по Telegram ID', async () => {
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 })

    const result = await sendTelegramNotification({
      telegramId: BigInt(123456789),
      text: 'Тестовое сообщение',
      sendMessage,
    })

    expect(result.success).toBe(true)
    expect(sendMessage).toHaveBeenCalledWith(BigInt(123456789), 'Тестовое сообщение', expect.any(Object))
  })

  it('должен отправить с inline-кнопками', async () => {
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 })
    const inlineKeyboard = [[{ text: 'Подтвердить', callback_data: 'confirm_1' }]]

    const result = await sendTelegramNotification({
      telegramId: BigInt(123456789),
      text: 'Тестовое сообщение',
      inlineKeyboard,
      sendMessage,
    })

    expect(result.success).toBe(true)
    expect(sendMessage).toHaveBeenCalledWith(
      BigInt(123456789),
      'Тестовое сообщение',
      expect.objectContaining({
        reply_markup: expect.objectContaining({
          inline_keyboard: inlineKeyboard,
        }),
      })
    )
  })

  it('должен обработать ошибку если бот заблокирован', async () => {
    const sendMessage = vi.fn().mockRejectedValue(new Error('Forbidden: bot was blocked'))

    const result = await sendTelegramNotification({
      telegramId: BigInt(123456789),
      text: 'Тестовое сообщение',
      sendMessage,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('BOT_BLOCKED')
    }
  })
})

describe('notifyUserViaTelegram', () => {
  it('должен отправить по userId через связь', async () => {
    const repo = createMockRepo({
      getTelegramLinkByUserId: vi.fn().mockResolvedValue(mockTelegramLink),
    })
    const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 })

    const result = await notifyUserViaTelegram({
      userId: 'user-1',
      text: 'Уведомление',
      repo,
      sendMessage,
    })

    expect(result.success).toBe(true)
    expect(sendMessage).toHaveBeenCalled()
  })

  it('должен пропустить если нет связи', async () => {
    const repo = createMockRepo()
    const sendMessage = vi.fn()

    const result = await notifyUserViaTelegram({
      userId: 'user-1',
      text: 'Уведомление',
      repo,
      sendMessage,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NO_TELEGRAM_LINK')
    }
    expect(sendMessage).not.toHaveBeenCalled()
  })
})
