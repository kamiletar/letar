import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createConsentRoute } from './create-consent-route'

function postRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/consent', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...headers },
  })
}

const VALID_BODY = {
  necessary: true,
  analytics: true,
  marketing: false,
  version: 'v1.2026',
  acceptedAt: '2026-07-28T12:00:00Z',
}

describe('createConsentRoute', () => {
  const getUserId = vi.fn()
  const saveConsentLog = vi.fn()

  beforeEach(() => {
    getUserId.mockReset().mockResolvedValue(null)
    saveConsentLog.mockReset().mockResolvedValue(undefined)
  })

  it('возвращает 400 на невалидное тело запроса', async () => {
    const POST = createConsentRoute({ getUserId, saveConsentLog })
    const res = await POST(postRequest({ analytics: true }))

    expect(res.status).toBe(400)
    expect(saveConsentLog).not.toHaveBeenCalled()
  })

  it('сохраняет согласие и возвращает ok:true при валидном теле', async () => {
    getUserId.mockResolvedValue('user-1')
    const POST = createConsentRoute({ getUserId, saveConsentLog })

    const res = await POST(postRequest(VALID_BODY, { 'x-forwarded-for': '203.0.113.9' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
    expect(saveConsentLog).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        acceptedAnalytics: true,
        acceptedMarketing: false,
        acceptedFunctional: true,
        consentVersion: 'v1.2026',
      }),
    )
  })

  it('anonymous-согласие: userId null, если сессии нет', async () => {
    const POST = createConsentRoute({ getUserId, saveConsentLog })
    await POST(postRequest(VALID_BODY))

    expect(saveConsentLog).toHaveBeenCalledWith(expect.objectContaining({ userId: null }))
  })

  it('acceptedFunctional всегда true — необходимые cookies нельзя отклонить', async () => {
    const POST = createConsentRoute({ getUserId, saveConsentLog })
    await POST(postRequest(VALID_BODY))

    expect(saveConsentLog).toHaveBeenCalledWith(expect.objectContaining({ acceptedFunctional: true }))
  })

  it('возвращает 400 если тело — не JSON', async () => {
    const POST = createConsentRoute({ getUserId, saveConsentLog })
    const req = new Request('http://localhost/api/consent', { method: 'POST', body: 'not-json' })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
