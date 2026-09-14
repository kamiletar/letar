import { describe, expect, it } from 'vitest'
import { createVerificationStreamToken, readVerificationStreamToken } from './stream-token'

const SECRET = 'test-secret-value'

describe('createVerificationStreamToken / readVerificationStreamToken', () => {
  it('round-trip: создаёт и читает обратно', () => {
    const token = createVerificationStreamToken({ email: 'user@example.com', secret: SECRET })
    expect(readVerificationStreamToken(token, { secret: SECRET })).toEqual({ email: 'user@example.com' })
  })

  it('приводит email к нижнему регистру', () => {
    const token = createVerificationStreamToken({ email: 'User@Example.COM', secret: SECRET })
    expect(readVerificationStreamToken(token, { secret: SECRET })).toEqual({ email: 'user@example.com' })
  })

  it('истёкший токен → null', () => {
    const now = 1_000_000
    const token = createVerificationStreamToken({ email: 'user@example.com', secret: SECRET, ttlSec: 100, now })
    expect(readVerificationStreamToken(token, { secret: SECRET, now: now + 101 })).toBeNull()
  })

  it('токен на самой границе истечения (x === now) → null', () => {
    const now = 1_000_000
    const token = createVerificationStreamToken({ email: 'user@example.com', secret: SECRET, ttlSec: 100, now })
    expect(readVerificationStreamToken(token, { secret: SECRET, now: now + 100 })).toBeNull()
  })

  it('другой секрет → null', () => {
    const token = createVerificationStreamToken({ email: 'user@example.com', secret: SECRET })
    expect(readVerificationStreamToken(token, { secret: 'other-secret' })).toBeNull()
  })

  it('подменённый payload при старой подписи → null', () => {
    const token = createVerificationStreamToken({ email: 'user@example.com', secret: SECRET })
    const [, signature] = token.split('.')
    const forgedPayload = Buffer.from(JSON.stringify({ e: 'attacker@example.com', x: 9_999_999_999 }), 'utf8').toString(
      'base64url',
    )
    expect(readVerificationStreamToken(`${forgedPayload}.${signature}`, { secret: SECRET })).toBeNull()
  })

  it.each(['', 'garbage', 'no-dot-here', '.no-payload', 'no-signature.'])('мусор %s → null', (garbage) => {
    expect(readVerificationStreamToken(garbage, { secret: SECRET })).toBeNull()
  })
})
