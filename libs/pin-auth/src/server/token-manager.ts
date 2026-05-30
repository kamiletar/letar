import { generatePin, generateToken } from './pin-generator'

export interface TokenManagerConfig {
  /** Время жизни PIN в миллисекундах (по умолчанию 10 минут) */
  pinValidityMs?: number
  /** Время жизни ссылки в миллисекундах (по умолчанию 24 часа) */
  linkValidityMs?: number
  /** Время между повторными отправками в миллисекундах (по умолчанию 60 секунд) */
  resendCooldownMs?: number
  /** Длина PIN-кода (по умолчанию 6) */
  pinLength?: number
}

export type ResendPinError = 'NOT_FOUND' | 'ALREADY_VERIFIED' | 'RATE_LIMITED' | 'UNKNOWN_ERROR'

export type ResendPinResult =
  | { success: true; token: string; pin: string; streamToken: string }
  | { success: false; error: ResendPinError }

export interface TokenManagerAdapter {
  /** Найти пользователя по email */
  findUser(email: string): Promise<{ id: string; emailVerified: boolean; name: string | null } | null>
  /** Найти последний токен по email */
  findLatestToken(identifier: string): Promise<{ pinExpires: Date | null } | null>
  /** Удалить все токены для email */
  deleteTokens(identifier: string): Promise<void>
  /**
   * Создать новый токен верификации.
   *
   * `streamToken` (§13.1) — непубличный идентификатор SSE-потока, используемый
   * вместо email в URL `/api/auth/verification-stream/${streamToken}`, чтобы
   * нельзя было подписаться на поток чужого email (enumeration). Адаптер должен
   * сохранить его, если в схеме есть колонка `streamToken`; иначе поле игнорируется
   * (обратная совместимость со старыми адаптерами).
   */
  createToken(data: {
    identifier: string
    token: string
    pin: string
    pinExpires: Date
    expires: Date
    streamToken: string
  }): Promise<void>
}

/**
 * Создаёт менеджер токенов для управления верификацией.
 *
 * @example
 * ```typescript
 * const tokenManager = createTokenManager({
 *   pinValidityMs: 10 * 60 * 1000,
 *   resendCooldownMs: 60 * 1000,
 * })
 *
 * const result = await tokenManager.resendPin(email, adapter)
 * if (result.success) {
 *   await sendEmail({ pin: result.pin, token: result.token })
 * }
 * ```
 */
export function createTokenManager(config: TokenManagerConfig = {}) {
  const {
    pinValidityMs = 10 * 60 * 1000, // 10 минут
    linkValidityMs = 24 * 60 * 60 * 1000, // 24 часа
    resendCooldownMs = 60 * 1000, // 60 секунд
    pinLength = 6,
  } = config

  return {
    config: { pinValidityMs, linkValidityMs, resendCooldownMs, pinLength },

    /**
     * Создаёт новый токен и PIN для верификации email.
     */
    async createVerificationToken(
      identifier: string,
      adapter: TokenManagerAdapter
    ): Promise<{ token: string; pin: string; streamToken: string }> {
      const token = generateToken()
      const pin = generatePin({ length: pinLength })
      // Непубличный токен SSE-потока (§13.1) — короче link-токена, отдельная сущность
      const streamToken = generateToken(16)
      const expires = new Date(Date.now() + linkValidityMs)
      const pinExpires = new Date(Date.now() + pinValidityMs)

      await adapter.createToken({
        identifier,
        token,
        pin,
        pinExpires,
        expires,
        streamToken,
      })

      return { token, pin, streamToken }
    },

    /**
     * Повторно отправляет PIN-код с проверкой rate limiting.
     */
    async resendPin(email: string, adapter: TokenManagerAdapter): Promise<ResendPinResult> {
      try {
        // Проверяем существует ли пользователь
        const user = await adapter.findUser(email)

        if (!user) {
          return { success: false, error: 'NOT_FOUND' }
        }

        // Проверяем не верифицирован ли уже email
        if (user.emailVerified) {
          return { success: false, error: 'ALREADY_VERIFIED' }
        }

        // Проверяем rate limiting
        const existingToken = await adapter.findLatestToken(email)

        if (existingToken?.pinExpires) {
          const tokenCreatedAt = existingToken.pinExpires.getTime() - pinValidityMs
          const timeSinceCreated = Date.now() - tokenCreatedAt
          if (timeSinceCreated < resendCooldownMs) {
            return { success: false, error: 'RATE_LIMITED' }
          }
        }

        // Удаляем старые токены
        await adapter.deleteTokens(email)

        // Создаём новый токен
        const { token, pin, streamToken } = await this.createVerificationToken(email, adapter)

        return { success: true, token, pin, streamToken }
      } catch (error) {
        console.error('Resend pin error:', error)
        return { success: false, error: 'UNKNOWN_ERROR' }
      }
    },
  }
}

export type TokenManager = ReturnType<typeof createTokenManager>
