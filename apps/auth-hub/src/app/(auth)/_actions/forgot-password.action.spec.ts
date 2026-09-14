import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestPasswordResetEmailOTP, resetPasswordEmailOTP, resolveLoginEmailMock } = vi.hoisted(() => ({
  requestPasswordResetEmailOTP: vi.fn(),
  resetPasswordEmailOTP: vi.fn(),
  resolveLoginEmailMock: vi.fn(async (email: string) => ({ email: email.toLowerCase(), resolved: false })),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}))

vi.mock('@/lib/resolve-login-email', () => ({
  resolveLoginEmail: resolveLoginEmailMock,
}))

vi.mock('@/lib/auth', () => ({
  auth: { api: { requestPasswordResetEmailOTP, resetPasswordEmailOTP } },
}))

import { requestPasswordReset, resetPasswordWithCode } from './forgot-password.action'

describe('requestPasswordReset', () => {
  beforeEach(() => {
    requestPasswordResetEmailOTP.mockReset()
  })

  it('резолвит linked-email в основной ДО вызова better-auth', async () => {
    resolveLoginEmailMock.mockResolvedValue({ email: 'owner@example.com', resolved: true })
    requestPasswordResetEmailOTP.mockResolvedValue({ success: true })

    const result = await requestPasswordReset('linked@example.com')

    expect(result).toEqual({ success: true })
    expect(requestPasswordResetEmailOTP).toHaveBeenCalledWith(
      expect.objectContaining({ body: { email: 'owner@example.com' } }),
    )
  })

  it('всегда отвечает success:true — не выдаёт наличие аккаунта, даже если better-auth бросил', async () => {
    resolveLoginEmailMock.mockResolvedValue({ email: 'unknown@example.com', resolved: false })
    requestPasswordResetEmailOTP.mockRejectedValue(new Error('boom'))

    const result = await requestPasswordReset('unknown@example.com')

    expect(result).toEqual({ success: true })
  })
})

describe('resetPasswordWithCode', () => {
  beforeEach(() => {
    resetPasswordEmailOTP.mockReset()
  })

  it('резолвит linked-email так же, как шаг запроса кода', async () => {
    resolveLoginEmailMock.mockResolvedValue({ email: 'owner@example.com', resolved: true })
    resetPasswordEmailOTP.mockResolvedValue({ success: true })

    const result = await resetPasswordWithCode({ email: 'linked@example.com', otp: '123456', password: 'Aa123456' })

    expect(result).toEqual({ success: true })
    expect(resetPasswordEmailOTP).toHaveBeenCalledWith(
      expect.objectContaining({ body: { email: 'owner@example.com', otp: '123456', password: 'Aa123456' } }),
    )
  })

  it.each([
    ['INVALID_OTP', 'Неверный код'],
    ['OTP_EXPIRED', 'Код истёк — отправьте новый'],
    ['TOO_MANY_ATTEMPTS', 'Слишком много попыток — отправьте новый код'],
    ['USER_NOT_FOUND', 'Аккаунт не найден'],
    ['PASSWORD_TOO_SHORT', 'Пароль слишком короткий (минимум 8 символов)'],
    ['PASSWORD_TOO_LONG', 'Пароль слишком короткий (минимум 8 символов)'],
  ])('разбирает body.code=%s в понятное сообщение', async (code, expectedError) => {
    resolveLoginEmailMock.mockResolvedValue({ email: 'owner@example.com', resolved: false })
    resetPasswordEmailOTP.mockRejectedValue({ body: { code, message: code } })

    const result = await resetPasswordWithCode({ email: 'owner@example.com', otp: '000000', password: 'Aa123456' })

    expect(result).toEqual({ success: false, error: expectedError })
  })

  it('неизвестный код ошибки → общее сообщение, не текст better-auth', async () => {
    resolveLoginEmailMock.mockResolvedValue({ email: 'owner@example.com', resolved: false })
    resetPasswordEmailOTP.mockRejectedValue({ body: { code: 'SOME_UNKNOWN_CODE', message: 'internal detail' } })

    const result = await resetPasswordWithCode({ email: 'owner@example.com', otp: '000000', password: 'Aa123456' })

    expect(result).toEqual({ success: false, error: 'Не удалось сбросить пароль. Попробуйте ещё раз' })
  })
})
