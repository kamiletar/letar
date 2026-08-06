import { describe, expect, it, vi } from 'vitest'
import { createPinValidator, type PinValidatorAdapter, type VerificationTokenData } from './pin-validator'

/** Создаёт мок-адаптер с заданным токеном верификации. */
function createMockAdapter(token: Partial<VerificationTokenData> | null): PinValidatorAdapter {
  const fullToken: VerificationTokenData | null = token === null
    ? null
    : {
      token: 'tok-1',
      identifier: 'user@example.com',
      pin: '123456',
      pinExpires: new Date(Date.now() + 10 * 60 * 1000),
      pinAttempts: 0,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ...token,
    }

  return {
    findToken: vi.fn().mockResolvedValue(fullToken),
    incrementAttempts: vi.fn().mockResolvedValue(undefined),
    findUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
    verifyUserEmail: vi.fn().mockResolvedValue(undefined),
    updateTokenForAutoLogin: vi.fn().mockResolvedValue(undefined),
  }
}

describe('createPinValidator — constant-time PIN compare (§13.2)', () => {
  const validator = createPinValidator()
  const tokenGen = () => 'auto-login-token'

  it('принимает верный PIN и возвращает токен авто-логина', async () => {
    const adapter = createMockAdapter({ pin: '123456' })
    const result = await validator.verifyPin('user@example.com', '123456', adapter, tokenGen)

    expect(result).toEqual({ success: true, token: 'auto-login-token' })
    expect(adapter.verifyUserEmail).toHaveBeenCalledWith('user-1')
    expect(adapter.updateTokenForAutoLogin).toHaveBeenCalledOnce()
  })

  it('отклоняет неверный PIN той же длины и инкрементирует попытки', async () => {
    const adapter = createMockAdapter({ pin: '123456' })
    const result = await validator.verifyPin('user@example.com', '654321', adapter, tokenGen)

    expect(result).toEqual({ success: false, error: 'INVALID_PIN' })
    expect(adapter.incrementAttempts).toHaveBeenCalledWith('tok-1')
  })

  it('отклоняет PIN другой длины без выброса (timingSafeEqual не падает)', async () => {
    const adapter = createMockAdapter({ pin: '123456' })
    const result = await validator.verifyPin('user@example.com', '12345', adapter, tokenGen)

    expect(result).toEqual({ success: false, error: 'INVALID_PIN' })
  })

  it('отклоняет, если PIN в токене равен null', async () => {
    const adapter = createMockAdapter({ pin: null })
    const result = await validator.verifyPin('user@example.com', '123456', adapter, tokenGen)

    expect(result).toEqual({ success: false, error: 'INVALID_PIN' })
  })

  it('возвращает PIN_EXPIRED для истёкшего PIN', async () => {
    const adapter = createMockAdapter({ pinExpires: new Date(Date.now() - 1000) })
    const result = await validator.verifyPin('user@example.com', '123456', adapter, tokenGen)

    expect(result).toEqual({ success: false, error: 'PIN_EXPIRED' })
  })

  it('возвращает TOO_MANY_ATTEMPTS при превышении лимита', async () => {
    const adapter = createMockAdapter({ pinAttempts: 5 })
    const result = await validator.verifyPin('user@example.com', '123456', adapter, tokenGen)

    expect(result).toEqual({ success: false, error: 'TOO_MANY_ATTEMPTS' })
  })

  it('возвращает NOT_FOUND, если токен отсутствует', async () => {
    const adapter = createMockAdapter(null)
    const result = await validator.verifyPin('user@example.com', '123456', adapter, tokenGen)

    expect(result).toEqual({ success: false, error: 'NOT_FOUND' })
  })
})
