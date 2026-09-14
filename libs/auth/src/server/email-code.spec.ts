import { describe, expect, it, vi } from 'vitest'
import { createEmailCodeOptions, createEmailVerificationCode, EMAIL_CODE_DEFAULTS } from './email-code'

describe('createEmailCodeOptions', () => {
  it('маршрутизирует email-verification на sendVerificationEmail', async () => {
    const sendVerificationEmail = vi.fn().mockResolvedValue(undefined)
    const sendPasswordResetEmail = vi.fn().mockResolvedValue(undefined)
    const options = createEmailCodeOptions({ sendVerificationEmail, sendPasswordResetEmail })

    await options.sendVerificationOTP({ email: 'user@example.com', otp: '123456', type: 'email-verification' })

    expect(sendVerificationEmail).toHaveBeenCalledWith({
      to: 'user@example.com',
      pin: '123456',
      pinExpiresInMinutes: EMAIL_CODE_DEFAULTS.expiresInSec / 60,
    })
    expect(sendPasswordResetEmail).not.toHaveBeenCalled()
  })

  it('маршрутизирует forget-password на sendPasswordResetEmail', async () => {
    const sendVerificationEmail = vi.fn().mockResolvedValue(undefined)
    const sendPasswordResetEmail = vi.fn().mockResolvedValue(undefined)
    const options = createEmailCodeOptions({ sendVerificationEmail, sendPasswordResetEmail })

    await options.sendVerificationOTP({ email: 'user@example.com', otp: '654321', type: 'forget-password' })

    expect(sendPasswordResetEmail).toHaveBeenCalledWith({
      to: 'user@example.com',
      pin: '654321',
      pinExpiresInMinutes: EMAIL_CODE_DEFAULTS.expiresInSec / 60,
    })
    expect(sendVerificationEmail).not.toHaveBeenCalled()
  })

  it('срок кода в минутах = expiresInSec / 60', () => {
    expect(EMAIL_CODE_DEFAULTS.expiresInSec / 60).toBe(10)
  })

  it('бросает на неожиданном type (sign-in/change-email должны быть закрыты disabledPaths)', async () => {
    const options = createEmailCodeOptions({
      sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    })

    await expect(options.sendVerificationOTP({ email: 'x@example.com', otp: '000000', type: 'sign-in' })).rejects
      .toThrow()
  })
})

describe('createEmailVerificationCode', () => {
  it('вызывает createVerificationOTP с type email-verification', async () => {
    const createVerificationOTP = vi.fn().mockResolvedValue('the-code')
    const code = await createEmailVerificationCode({ createVerificationOTP }, 'user@example.com')

    expect(code).toBe('the-code')
    expect(createVerificationOTP).toHaveBeenCalledWith({
      body: { email: 'user@example.com', type: 'email-verification' },
    })
  })
})
