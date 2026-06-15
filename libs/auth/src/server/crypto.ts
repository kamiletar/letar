import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'

/**
 * Читает AUTH_ENCRYPTION_KEY из env (64 hex-символа = 32 байта).
 * Fail-fast: бросает ошибку при старте если ключ не задан.
 */
export function getEncryptionKey(): Buffer {
  const hex = process.env.AUTH_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('[auth/crypto] AUTH_ENCRYPTION_KEY не задан или неверной длины (нужно 64 hex-символа = 32 байта)')
  }
  return Buffer.from(hex, 'hex')
}

/**
 * AES-256-GCM шифрование — для долгосрочных секретов (clientSecret).
 * Каждый вызов генерирует уникальный IV → не-детерминированный, максимально безопасный.
 * Формат: `gcm:<iv-hex>:<cipher-hex>:<tag-hex>`
 */
export function encryptSecret(plaintext: string, key: Buffer): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `gcm:${iv.toString('hex')}:${encrypted.toString('hex')}:${tag.toString('hex')}`
}

/**
 * Расшифровывает строку, зашифрованную через encryptSecret.
 * Если строка не начинается с `gcm:` — возвращает как есть (plaintext, обратная совместимость).
 */
export function decryptSecret(ciphertext: string, key: Buffer): string {
  if (!ciphertext.startsWith('gcm:')) {
    return ciphertext
  }
  const parts = ciphertext.split(':')
  if (parts.length !== 4) {
    throw new Error('[auth/crypto] Неверный формат зашифрованного значения')
  }
  const [, ivHex, cipherHex, tagHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted = Buffer.from(cipherHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}

/**
 * AES-256-CBC детерминированное шифрование — для поисковых токенов (accessToken в WHERE).
 * Одинаковый plaintext + key всегда даёт одинаковый ciphertext → можно искать по значению.
 * IV выводится детерминированно из ключа и соли (fieldName).
 * Формат: `cbc:<cipher-hex>`
 */
export function encryptToken(plaintext: string, key: Buffer, salt: string): string {
  // IV = первые 16 байт HMAC-SHA256(key, salt) — детерминирован, уникален per-field
  const iv = createHmac('sha256', key).update(salt).digest().subarray(0, 16)
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  return `cbc:${encrypted.toString('hex')}`
}

/**
 * Расшифровывает строку, зашифрованную через encryptToken.
 * Если строка не начинается с `cbc:` — возвращает как есть (обратная совместимость).
 */
export function decryptToken(ciphertext: string, key: Buffer, salt: string): string {
  if (!ciphertext.startsWith('cbc:')) {
    return ciphertext
  }
  const cipherHex = ciphertext.slice(4)
  const iv = createHmac('sha256', key).update(salt).digest().subarray(0, 16)
  const decipher = createDecipheriv('aes-256-cbc', key, iv)
  const encrypted = Buffer.from(cipherHex, 'hex')
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}

/** Проверяет, зашифровано ли значение (любым нашим методом) */
export function isEncrypted(value: string): boolean {
  return value.startsWith('gcm:') || value.startsWith('cbc:')
}
