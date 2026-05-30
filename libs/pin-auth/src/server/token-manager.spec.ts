import { describe, expect, it, vi } from 'vitest'
import { createTokenManager, type TokenManagerAdapter } from './token-manager'

function createMockAdapter(overrides: Partial<TokenManagerAdapter> = {}): TokenManagerAdapter {
  return {
    findUser: vi.fn().mockResolvedValue({ id: 'user-1', emailVerified: false, name: 'Тест' }),
    findLatestToken: vi.fn().mockResolvedValue(null),
    deleteTokens: vi.fn().mockResolvedValue(undefined),
    createToken: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('createTokenManager — streamToken (§13.1)', () => {
  const manager = createTokenManager()

  it('генерирует streamToken и передаёт его в createToken', async () => {
    const adapter = createMockAdapter()
    const result = await manager.createVerificationToken('user@example.com', adapter)

    expect(result.streamToken).toMatch(/^[0-9a-f]{32}$/)
    expect(result.token).not.toBe(result.streamToken)
    expect(adapter.createToken).toHaveBeenCalledWith(expect.objectContaining({ streamToken: result.streamToken }))
  })

  it('resendPin возвращает streamToken при успехе', async () => {
    const adapter = createMockAdapter()
    const result = await manager.resendPin('user@example.com', adapter)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.streamToken).toMatch(/^[0-9a-f]{32}$/)
    }
  })

  it('resendPin возвращает RATE_LIMITED внутри cooldown', async () => {
    const adapter = createMockAdapter({
      // токен создан только что → внутри 60s cooldown
      findLatestToken: vi.fn().mockResolvedValue({ pinExpires: new Date(Date.now() + 10 * 60 * 1000) }),
    })
    const result = await manager.resendPin('user@example.com', adapter)

    expect(result).toEqual({ success: false, error: 'RATE_LIMITED' })
  })

  it('resendPin возвращает ALREADY_VERIFIED для верифицированного email', async () => {
    const adapter = createMockAdapter({
      findUser: vi.fn().mockResolvedValue({ id: 'user-1', emailVerified: true, name: null }),
    })
    const result = await manager.resendPin('user@example.com', adapter)

    expect(result).toEqual({ success: false, error: 'ALREADY_VERIFIED' })
  })
})
