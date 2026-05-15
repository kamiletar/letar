/**
 * Тесты для привязки Telegram аккаунтов
 *
 * Покрывает:
 * - Привязка аккаунта (linkTelegramAccount)
 * - Отвязка аккаунта (unlinkTelegramAccount)
 * - Получение связей (getTelegramLinkByUserId, getTelegramLinkByTelegramId)
 */

import {
  getTelegramLinkByTelegramId,
  getTelegramLinkByUserId,
  linkTelegramAccount,
  unlinkTelegramAccount,
} from './telegram-service'
import { createMockRepo, mockLinkToken, mockTelegramLink } from './telegram-service.mocks'

describe('linkTelegramAccount', () => {
  it('должен создать связь по токену', async () => {
    const repo = createMockRepo({
      getLinkTokenByToken: vi.fn().mockResolvedValue(mockLinkToken),
    })

    const result = await linkTelegramAccount({
      token: 'abc123',
      telegramId: BigInt(123456789),
      username: 'ivanov',
      firstName: 'Иван',
      repo,
    })

    expect(result.success).toBe(true)
    expect(repo.createTelegramLink).toHaveBeenCalled()
  })

  it('должен сохранить Telegram ID, username, firstName', async () => {
    const repo = createMockRepo({
      getLinkTokenByToken: vi.fn().mockResolvedValue(mockLinkToken),
    })

    await linkTelegramAccount({
      token: 'abc123',
      telegramId: BigInt(123456789),
      username: 'ivanov',
      firstName: 'Иван',
      repo,
    })

    expect(repo.createTelegramLink).toHaveBeenCalledWith({
      userId: 'user-1',
      telegramId: BigInt(123456789),
      username: 'ivanov',
      firstName: 'Иван',
    })
  })

  it('должен пометить токен как использованный', async () => {
    const repo = createMockRepo({
      getLinkTokenByToken: vi.fn().mockResolvedValue(mockLinkToken),
    })

    await linkTelegramAccount({
      token: 'abc123',
      telegramId: BigInt(123456789),
      repo,
    })

    expect(repo.markTokenAsUsed).toHaveBeenCalledWith('token-1')
  })

  it('должен обновить существующую связь', async () => {
    const repo = createMockRepo({
      getLinkTokenByToken: vi.fn().mockResolvedValue(mockLinkToken),
      getTelegramLinkByUserId: vi.fn().mockResolvedValue(mockTelegramLink),
    })

    const result = await linkTelegramAccount({
      token: 'abc123',
      telegramId: BigInt(987654321),
      username: 'new_username',
      repo,
    })

    expect(result.success).toBe(true)
    expect(repo.updateTelegramLink).toHaveBeenCalledWith('link-1', {
      telegramId: BigInt(987654321),
      username: 'new_username',
      firstName: undefined,
    })
    expect(repo.createTelegramLink).not.toHaveBeenCalled()
  })
})

describe('unlinkTelegramAccount', () => {
  it('должен удалить связь', async () => {
    const repo = createMockRepo({
      getTelegramLinkByUserId: vi.fn().mockResolvedValue(mockTelegramLink),
    })

    const result = await unlinkTelegramAccount({ userId: 'user-1', repo })

    expect(result.success).toBe(true)
    expect(repo.deleteTelegramLink).toHaveBeenCalledWith('link-1')
  })

  it('должен вернуть ошибку если связь не найдена', async () => {
    const repo = createMockRepo()

    const result = await unlinkTelegramAccount({ userId: 'user-1', repo })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('LINK_NOT_FOUND')
    }
  })
})

describe('getTelegramLinkByUserId', () => {
  it('должен вернуть связь пользователя', async () => {
    const repo = createMockRepo({
      getTelegramLinkByUserId: vi.fn().mockResolvedValue(mockTelegramLink),
    })

    const result = await getTelegramLinkByUserId({ userId: 'user-1', repo })

    expect(result).toEqual(mockTelegramLink)
  })
})

describe('getTelegramLinkByTelegramId', () => {
  it('должен вернуть связь по Telegram ID', async () => {
    const repo = createMockRepo({
      getTelegramLinkByTelegramId: vi.fn().mockResolvedValue(mockTelegramLink),
    })

    const result = await getTelegramLinkByTelegramId({ telegramId: BigInt(123456789), repo })

    expect(result).toEqual(mockTelegramLink)
  })
})
