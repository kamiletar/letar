import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyCaptcha } from './verify'

// Мок глобального fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

afterEach(() => {
  mockFetch.mockReset()
})

describe('verifyCaptcha', () => {
  const baseOptions = { provider: 'turnstile' as const, secretKey: 'test-secret' }

  it('должен вернуть ошибку для пустого токена', async () => {
    const result = await verifyCaptcha(null, baseOptions)
    expect(result.success).toBe(false)
    expect(result.errorCodes).toContain('missing-input-response')
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('должен вернуть ошибку для undefined токена', async () => {
    const result = await verifyCaptcha(undefined, baseOptions)
    expect(result.success).toBe(false)
    expect(result.errorCodes).toContain('missing-input-response')
  })

  it('должен вызвать Turnstile URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, hostname: 'example.com' }),
    })

    const result = await verifyCaptcha('test-token', baseOptions)
    expect(result.success).toBe(true)
    expect(result.hostname).toBe('example.com')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('должен вызвать reCAPTCHA URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    await verifyCaptcha('token', { provider: 'recaptcha', secretKey: 'secret' })
    expect(mockFetch).toHaveBeenCalledWith('https://www.google.com/recaptcha/api/siteverify', expect.anything())
  })

  it('должен вызвать hCaptcha URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    await verifyCaptcha('token', { provider: 'hcaptcha', secretKey: 'secret' })
    expect(mockFetch).toHaveBeenCalledWith('https://api.hcaptcha.com/siteverify', expect.anything())
  })

  it('должен передать remoteIp если указан', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    })

    await verifyCaptcha('token', { ...baseOptions, remoteIp: '1.2.3.4' })

    const body = mockFetch.mock.calls[0][1].body as string
    expect(body).toContain('remoteip=1.2.3.4')
  })

  it('должен обработать network ошибку', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })

    const result = await verifyCaptcha('token', baseOptions)
    expect(result.success).toBe(false)
    expect(result.errorCodes).toContain('network-error')
  })

  it('должен пробросить error-codes от провайдера', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        'error-codes': ['invalid-input-response'],
      }),
    })

    const result = await verifyCaptcha('bad-token', baseOptions)
    expect(result.success).toBe(false)
    expect(result.errorCodes).toContain('invalid-input-response')
  })

  it('должен пробросить challenge_ts', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        challenge_ts: '2026-01-01T00:00:00Z',
      }),
    })

    const result = await verifyCaptcha('token', baseOptions)
    expect(result.challengeTs).toBe('2026-01-01T00:00:00Z')
  })

  describe('smartcaptcha', () => {
    const smartOptions = { provider: 'smartcaptcha' as const, secretKey: 'test-secret' }

    it('должен вызвать SmartCaptcha URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', message: '', host: 'example.com' }),
      })

      await verifyCaptcha('token', smartOptions)
      expect(mockFetch).toHaveBeenCalledWith('https://smartcaptcha.cloud.yandex.ru/validate', expect.anything())
    })

    it('должен отправлять secret+token+ip (не response/remoteip как у остальных)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', message: '' }),
      })

      await verifyCaptcha('my-token', { ...smartOptions, remoteIp: '1.2.3.4' })

      const body = mockFetch.mock.calls[0][1].body as string
      expect(body).toContain('token=my-token')
      expect(body).toContain('ip=1.2.3.4')
      expect(body).not.toContain('response=')
      expect(body).not.toContain('remoteip=')
    })

    it('status="ok" → success=true, host пробрасывается в hostname', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok', message: '', host: 'example.com' }),
      })

      const result = await verifyCaptcha('token', smartOptions)
      expect(result.success).toBe(true)
      expect(result.hostname).toBe('example.com')
    })

    it('status="failed" → success=false, message пробрасывается в errorCodes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'failed', message: 'Invalid or expired Token.' }),
      })

      const result = await verifyCaptcha('bad-token', smartOptions)
      expect(result.success).toBe(false)
      expect(result.errorCodes).toContain('Invalid or expired Token.')
    })

    it('status="failed" без message (это человек, а не ошибка запроса) → errorCodes не заполнен', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'failed', message: '' }),
      })

      const result = await verifyCaptcha('token', smartOptions)
      expect(result.success).toBe(false)
      expect(result.errorCodes).toBeUndefined()
    })
  })
})
