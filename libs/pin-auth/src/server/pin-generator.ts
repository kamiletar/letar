import crypto from 'crypto'

export interface PinGeneratorConfig {
  /** Длина PIN-кода (по умолчанию 6) */
  length?: number
}

/**
 * Генерирует криптографически безопасный PIN-код заданной длины.
 *
 * @example
 * ```typescript
 * const pin = generatePin() // "123456"
 * const pin8 = generatePin({ length: 8 }) // "12345678"
 * ```
 */
export function generatePin(config: PinGeneratorConfig = {}): string {
  const { length = 6 } = config
  const randomBytes = crypto.randomBytes(4)
  const num = randomBytes.readUInt32BE(0)
  const max = Math.pow(10, length)
  return (num % max).toString().padStart(length, '0')
}

/**
 * Генерирует криптографически безопасный токен.
 *
 * @example
 * ```typescript
 * const token = generateToken() // 64-символьный hex-токен
 * const token32 = generateToken(16) // 32-символьный hex-токен
 * ```
 */
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex')
}
