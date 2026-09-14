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

describe('createPinValidator — reserveAttempt (race-safe лимит попыток)', () => {
  const tokenGen = () => 'auto-login-token'
  const identifier = 'user@example.com'

  /** Уступает очередь микрозадач — так параллельные вызовы (`Promise.all`) реально перемежаются. */
  const yieldTurn = () => Promise.resolve().then(() => undefined)

  /**
   * In-memory compare-and-swap счётчик с искусственным yield между чтением и записью —
   * эмулирует то, как реальная БД (`findFirst` → `updateMany` с условием на прежнее значение)
   * ведёт себя под параллельной нагрузкой: между чтением и записью может вклиниться другой
   * запрос, тогда CAS проигрывает гонку и перечитывает.
   */
  function createCasCounter() {
    let value = 0
    return {
      async reserve(): Promise<number> {
        for (let i = 0; i < 100; i++) {
          const before = value
          await yieldTurn()
          if (value !== before) {
            continue
          }
          value = before + 1
          return before
        }
        return Number.POSITIVE_INFINITY
      },
    }
  }

  function createAdapterBase(pin: string): Omit<PinValidatorAdapter, 'reserveAttempt' | 'incrementAttempts'> {
    return {
      findToken: vi.fn().mockResolvedValue(
        {
          token: 'tok-1',
          identifier,
          pin,
          pinExpires: new Date(Date.now() + 10 * 60 * 1000),
          pinAttempts: 0, // не используется, когда задан reserveAttempt
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        } satisfies VerificationTokenData,
      ),
      findUser: vi.fn().mockResolvedValue({ id: 'user-1' }),
      verifyUserEmail: vi.fn().mockResolvedValue(undefined),
      updateTokenForAutoLogin: vi.fn().mockResolvedValue(undefined),
    }
  }

  it('20 параллельных неверных попыток дают не более maxAttempts сравнений PIN', async () => {
    const maxAttempts = 5
    const validator = createPinValidator({ maxAttempts })
    const counter = createCasCounter()
    const incrementAttempts = vi.fn().mockResolvedValue(undefined)

    const adapter: PinValidatorAdapter = {
      ...createAdapterBase('111111'),
      incrementAttempts,
      reserveAttempt: () => counter.reserve(),
    }

    const guesses = Array.from({ length: 20 }, (_, i) => String(i).padStart(6, '0'))
    const results = await Promise.all(
      guesses.map((pin) => validator.verifyPin(identifier, pin, adapter, tokenGen)),
    )

    const invalidPin = results.filter((r) => !r.success && r.error === 'INVALID_PIN')
    const tooManyAttempts = results.filter((r) => !r.success && r.error === 'TOO_MANY_ATTEMPTS')

    expect(invalidPin.length).toBeLessThanOrEqual(maxAttempts)
    expect(tooManyAttempts.length).toBeGreaterThanOrEqual(20 - maxAttempts)
    expect(invalidPin.length + tooManyAttempts.length).toBe(20)
    // Легаси-путь не используется, когда reserveAttempt задан
    expect(incrementAttempts).not.toHaveBeenCalled()
  })

  it('без reserveAttempt (легаси-адаптер) параллельные запросы обходят maxAttempts — race-prone путь', async () => {
    const maxAttempts = 5
    const validator = createPinValidator({ maxAttempts })
    const incrementAttempts = vi.fn().mockResolvedValue(undefined)

    // reserveAttempt намеренно отсутствует — валидатор падает на старый check-then-act путь
    const adapter: PinValidatorAdapter = {
      ...createAdapterBase('111111'),
      incrementAttempts,
    }

    const guesses = Array.from({ length: 20 }, (_, i) => String(i).padStart(6, '0'))
    const results = await Promise.all(
      guesses.map((pin) => validator.verifyPin(identifier, pin, adapter, tokenGen)),
    )

    const invalidPin = results.filter((r) => !r.success && r.error === 'INVALID_PIN')

    // Документирует известную ловушку: без reserveAttempt все параллельные запросы читают
    // один и тот же pinAttempts=0 и сравнивают PIN, прежде чем хоть один инкремент применится —
    // maxAttempts не соблюдается под нагрузкой.
    expect(invalidPin.length).toBe(20)
    expect(incrementAttempts).toHaveBeenCalledTimes(20)
  })
})
