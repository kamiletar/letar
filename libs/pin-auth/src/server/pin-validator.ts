import { timingSafeEqual } from 'crypto'

/**
 * Сравнение PIN-кодов в постоянном времени — защита от timing-атак (§13.2).
 *
 * Длина PIN не является секретом (фиксированная, напр. 6 цифр), поэтому ранний
 * выход при несовпадении длины допустим и не раскрывает чувствительной информации.
 */
function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) {
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

export interface PinValidationConfig {
  /** Максимальное количество попыток (по умолчанию 5) */
  maxAttempts?: number
  /** Время жизни PIN в миллисекундах (по умолчанию 10 минут) */
  pinValidityMs?: number
}

export type PinValidationError =
  | 'NOT_FOUND'
  | 'INVALID_PIN'
  | 'PIN_EXPIRED'
  | 'TOO_MANY_ATTEMPTS'
  | 'USER_NOT_FOUND'
  | 'UNKNOWN_ERROR'

export type PinValidationResult = { success: true; token: string } | { success: false; error: PinValidationError }

export interface VerificationTokenData {
  token: string
  identifier: string
  pin: string | null
  pinExpires: Date | null
  pinAttempts: number
  expires: Date
}

export interface PinValidatorAdapter {
  /** Найти токен по email */
  findToken(identifier: string): Promise<VerificationTokenData | null>
  /** Увеличить счётчик неудачных попыток */
  incrementAttempts(token: string): Promise<void>
  /** Найти пользователя по email */
  findUser(email: string): Promise<{ id: string } | null>
  /** Верифицировать email пользователя */
  verifyUserEmail(userId: string): Promise<void>
  /**
   * Заменить PIN-токен на одноразовый токен авто-логина (§13.8 — single-use).
   *
   * ⚠️ Реализация ОБЯЗАНА быть атомарной заменой (удалить старую запись + создать
   * новую), а не in-place `update`: это исключает окно, в котором по старому
   * значению ещё можно верифицироваться. Токен авто-логина — одноразовый:
   * потребитель ОБЯЗАН удалить его (или пометить `used`) сразу после успешного
   * входа, чтобы повторное предъявление было отклонено.
   */
  updateTokenForAutoLogin(oldToken: string, newToken: string, expires: Date): Promise<void>
}

/**
 * Создаёт валидатор PIN-кодов с настраиваемым адаптером БД.
 *
 * @example
 * ```typescript
 * const validator = createPinValidator({
 *   maxAttempts: 5,
 *   pinValidityMs: 10 * 60 * 1000,
 * })
 *
 * const result = await validator.verifyPin(email, pin, adapter)
 * if (result.success) {
 *   // Авто-логин с result.token
 * }
 * ```
 */
export function createPinValidator(config: PinValidationConfig = {}) {
  const { maxAttempts = 5, pinValidityMs = 10 * 60 * 1000 } = config

  return {
    config: { maxAttempts, pinValidityMs },

    /**
     * Проверяет PIN-код и возвращает токен для авто-логина при успехе.
     */
    async verifyPin(
      identifier: string,
      pin: string,
      adapter: PinValidatorAdapter,
      tokenGenerator: () => string
    ): Promise<PinValidationResult> {
      try {
        // Находим токен верификации
        const verificationToken = await adapter.findToken(identifier)

        if (!verificationToken) {
          return { success: false, error: 'NOT_FOUND' }
        }

        // Проверяем количество попыток
        if (verificationToken.pinAttempts >= maxAttempts) {
          return { success: false, error: 'TOO_MANY_ATTEMPTS' }
        }

        // Проверяем срок действия PIN
        if (!verificationToken.pinExpires || verificationToken.pinExpires < new Date()) {
          return { success: false, error: 'PIN_EXPIRED' }
        }

        // Проверяем PIN в постоянном времени (защита от timing-атак, §13.2)
        if (verificationToken.pin === null || !timingSafeEqualStr(verificationToken.pin, pin)) {
          await adapter.incrementAttempts(verificationToken.token)
          return { success: false, error: 'INVALID_PIN' }
        }

        // PIN верный — верифицируем email
        const user = await adapter.findUser(identifier)

        if (!user) {
          return { success: false, error: 'USER_NOT_FOUND' }
        }

        // Генерируем токен для авто-логина
        const autoLoginToken = tokenGenerator()
        const autoLoginExpires = new Date(Date.now() + 5 * 60 * 1000) // 5 минут

        // Обновляем пользователя и токен
        await adapter.verifyUserEmail(user.id)
        await adapter.updateTokenForAutoLogin(verificationToken.token, autoLoginToken, autoLoginExpires)

        return { success: true, token: autoLoginToken }
      } catch (error) {
        console.error('Verify pin error:', error)
        return { success: false, error: 'UNKNOWN_ERROR' }
      }
    },
  }
}

export type PinValidator = ReturnType<typeof createPinValidator>
