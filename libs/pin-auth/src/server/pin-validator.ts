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
  /**
   * Увеличить счётчик неудачных попыток.
   *
   * ⚠️ Race-prone путь: используется, только если адаптер НЕ реализует `reserveAttempt`.
   * Валидатор читает `pinAttempts` из `findToken`, сравнивает PIN, и лишь потом вызывает
   * этот метод — классический check-then-act. Под параллельной нагрузкой (несколько
   * запросов на один email одновременно) все они читают один и тот же счётчик и успевают
   * сравнить PIN, прежде чем хоть один из них успешно увеличит его, так что `maxAttempts`
   * не соблюдается — пачка из N параллельных запросов даёт N сравнений, а не `maxAttempts`.
   * Реализуйте `reserveAttempt`, если приложению важна защита от параллельного перебора.
   */
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
  /**
   * Атомарно резервирует попытку ввода PIN и возвращает число попыток, сделанных ДО неё.
   *
   * Когда реализован, валидатор вызывает его вместо чтения `pinAttempts`/`incrementAttempts` —
   * резервация происходит ДО сравнения PIN, так что параллельные запросы получают разные
   * порядковые номера попытки вместо гонки за один и тот же счётчик (см. предупреждение у
   * `incrementAttempts`). Реализация ОБЯЗАНА быть compare-and-swap (прочитать текущее
   * значение → атомарно обновить только если оно не изменилось → повторить при конфликте),
   * а не read-then-write — иначе не даёт гарантии, ради которой существует.
   *
   * Опционален для обратной совместимости со старыми адаптерами (см. `incrementAttempts`).
   */
  reserveAttempt?(identifier: string): Promise<number>
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
      tokenGenerator: () => string,
    ): Promise<PinValidationResult> {
      try {
        // Находим токен верификации
        const verificationToken = await adapter.findToken(identifier)

        if (!verificationToken) {
          return { success: false, error: 'NOT_FOUND' }
        }

        // Резервируем попытку атомарно (race-safe), если адаптер это поддерживает — иначе
        // используем pinAttempts, прочитанный вместе с токеном (race-prone legacy-путь,
        // см. предупреждение у `incrementAttempts` в PinValidatorAdapter).
        const attemptsBefore = adapter.reserveAttempt
          ? await adapter.reserveAttempt(identifier)
          : verificationToken.pinAttempts

        // Проверяем количество попыток
        if (attemptsBefore >= maxAttempts) {
          return { success: false, error: 'TOO_MANY_ATTEMPTS' }
        }

        // Проверяем срок действия PIN
        if (!verificationToken.pinExpires || verificationToken.pinExpires < new Date()) {
          return { success: false, error: 'PIN_EXPIRED' }
        }

        // Проверяем PIN в постоянном времени (защита от timing-атак, §13.2)
        if (verificationToken.pin === null || !timingSafeEqualStr(verificationToken.pin, pin)) {
          if (!adapter.reserveAttempt) {
            // Попытка уже учтена атомарно в reserveAttempt выше — легаси-путь инкрементирует здесь
            await adapter.incrementAttempts(verificationToken.token)
          }
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
