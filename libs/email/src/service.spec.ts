import { describe, expect, it } from 'vitest'
import { sendPasswordResetEmail, sendVerificationEmail } from './service'

describe('sendVerificationEmail — инвариант verificationUrl/pin', () => {
  it('бросает, если нет ни verificationUrl, ни pin', async () => {
    await expect(sendVerificationEmail({ to: 'user@example.com' })).rejects.toThrow(
      'sendVerificationEmail: нужен verificationUrl или pin',
    )
  })
})

describe('sendPasswordResetEmail — инвариант resetUrl/pin', () => {
  it('бросает, если нет ни resetUrl, ни pin', async () => {
    await expect(sendPasswordResetEmail({ to: 'user@example.com' })).rejects.toThrow(
      'sendPasswordResetEmail: нужен resetUrl или pin',
    )
  })
})
