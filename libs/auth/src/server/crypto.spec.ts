import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { decryptSecret, decryptToken, encryptSecret, encryptToken, isEncrypted } from './crypto'

const KEY = randomBytes(32)

describe('encryptSecret / decryptSecret (AES-256-GCM)', () => {
  it('round-trip: шифрует и расшифровывает обратно', () => {
    const plain = 'super-secret-client-secret-value'
    const cipher = encryptSecret(plain, KEY)
    expect(decryptSecret(cipher, KEY)).toBe(plain)
  })

  it('зашифрованная строка начинается с gcm:', () => {
    expect(encryptSecret('test', KEY)).toMatch(/^gcm:/)
  })

  it('каждый вызов даёт уникальный ciphertext (random IV)', () => {
    const a = encryptSecret('same', KEY)
    const b = encryptSecret('same', KEY)
    expect(a).not.toBe(b)
  })

  it('decryptSecret возвращает plaintext без изменений (обратная совместимость)', () => {
    expect(decryptSecret('plain-not-encrypted', KEY)).toBe('plain-not-encrypted')
  })

  it('бросает ошибку при неверном формате gcm:', () => {
    expect(() => decryptSecret('gcm:bad', KEY)).toThrow()
  })
})

describe('encryptToken / decryptToken (AES-256-CBC детерминированный)', () => {
  it('round-trip: шифрует и расшифровывает обратно', () => {
    const token = 'oidc-access-token-abcdef123456'
    const cipher = encryptToken(token, KEY, 'accessToken')
    expect(decryptToken(cipher, KEY, 'accessToken')).toBe(token)
  })

  it('зашифрованная строка начинается с cbc:', () => {
    expect(encryptToken('tok', KEY, 'accessToken')).toMatch(/^cbc:/)
  })

  it('детерминированный: одинаковый вход даёт одинаковый выход', () => {
    const a = encryptToken('same-token', KEY, 'accessToken')
    const b = encryptToken('same-token', KEY, 'accessToken')
    expect(a).toBe(b)
  })

  it('разные salt дают разный ciphertext', () => {
    const a = encryptToken('tok', KEY, 'accessToken')
    const b = encryptToken('tok', KEY, 'refreshToken')
    expect(a).not.toBe(b)
  })

  it('decryptToken возвращает plaintext без изменений (обратная совместимость)', () => {
    expect(decryptToken('plain-token', KEY, 'accessToken')).toBe('plain-token')
  })
})

describe('isEncrypted', () => {
  it('возвращает true для gcm: строк', () => {
    expect(isEncrypted(encryptSecret('x', KEY))).toBe(true)
  })

  it('возвращает true для cbc: строк', () => {
    expect(isEncrypted(encryptToken('x', KEY, 's'))).toBe(true)
  })

  it('возвращает false для plaintext', () => {
    expect(isEncrypted('plain-value')).toBe(false)
  })
})
