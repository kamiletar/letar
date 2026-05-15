/**
 * Тесты для токенов привязки Telegram
 *
 * Покрывает:
 * - Генерация токенов (generateLinkToken)
 * - Верификация токенов (verifyLinkToken)
 */

import { generateLinkToken, verifyLinkToken } from './telegram-service'
import { createMockRepo, mockLinkToken } from './telegram-service.mocks'

describe('generateLinkToken', () => {
  it('должен создать уникальный токен', async () => {
    const repo = createMockRepo()

    const result = await generateLinkToken({ userId: 'user-1', repo })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.token).toBeDefined()
      expect(result.token.length).toBeGreaterThan(20)
    }
    expect(repo.createLinkToken).toHaveBeenCalled()
  })

  it('должен установить срок действия (1 час)', async () => {
    const repo = createMockRepo()
    const now = Date.now()

    await generateLinkToken({ userId: 'user-1', repo })

    expect(repo.createLinkToken).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        expiresAt: expect.any(Date),
      })
    )

    const callArgs = vi.mocked(repo.createLinkToken).mock.calls[0][0]
    const expiresAt = callArgs.expiresAt.getTime()
    // Проверяем что срок ~1 час (с погрешностью 5 сек)
    expect(expiresAt).toBeGreaterThan(now + 3595000)
    expect(expiresAt).toBeLessThan(now + 3605000)
  })

  it('должен удалить старые токены пользователя', async () => {
    const repo = createMockRepo()

    await generateLinkToken({ userId: 'user-1', repo })

    expect(repo.deleteOldTokensByUserId).toHaveBeenCalledWith('user-1')
  })
})

describe('verifyLinkToken', () => {
  it('должен вернуть успех для валидного токена', async () => {
    const repo = createMockRepo({
      getLinkTokenByToken: vi.fn().mockResolvedValue(mockLinkToken),
    })

    const result = await verifyLinkToken({ token: 'abc123', repo })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.userId).toBe('user-1')
    }
  })

  it('должен вернуть ошибку если токен не найден', async () => {
    const repo = createMockRepo()

    const result = await verifyLinkToken({ token: 'invalid', repo })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('TOKEN_NOT_FOUND')
    }
  })

  it('должен вернуть ошибку если токен истёк', async () => {
    const expiredToken = { ...mockLinkToken, expiresAt: new Date(Date.now() - 1000) }
    const repo = createMockRepo({
      getLinkTokenByToken: vi.fn().mockResolvedValue(expiredToken),
    })

    const result = await verifyLinkToken({ token: 'abc123', repo })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('TOKEN_EXPIRED')
    }
  })

  it('должен вернуть ошибку если токен уже использован', async () => {
    const usedToken = { ...mockLinkToken, usedAt: new Date() }
    const repo = createMockRepo({
      getLinkTokenByToken: vi.fn().mockResolvedValue(usedToken),
    })

    const result = await verifyLinkToken({ token: 'abc123', repo })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('TOKEN_ALREADY_USED')
    }
  })
})
