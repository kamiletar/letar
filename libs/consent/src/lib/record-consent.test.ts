import { describe, expect, it, vi } from 'vitest'
import { buildConsentLogData, recordConsent } from './record-consent'

function fakeRequest(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/consent', { headers })
}

describe('buildConsentLogData', () => {
  it('добавляет ipHash и userAgent к переданным полям', () => {
    const data = buildConsentLogData(
      {
        userId: 'u1',
        acceptedAnalytics: true,
        acceptedMarketing: false,
        acceptedFunctional: true,
        consentVersion: 'v1',
      },
      fakeRequest({ 'x-forwarded-for': '203.0.113.1', 'user-agent': 'test-ua' }),
    )

    expect(data).toMatchObject({
      userId: 'u1',
      acceptedAnalytics: true,
      acceptedMarketing: false,
      acceptedFunctional: true,
      consentVersion: 'v1',
      userAgent: 'test-ua',
    })
    expect(data.ipHash).toHaveLength(64)
  })

  it('userAgent — null, если заголовок отсутствует', () => {
    const data = buildConsentLogData(
      { acceptedAnalytics: false, acceptedMarketing: false, acceptedFunctional: true, consentVersion: 'v1' },
      fakeRequest({}),
    )
    expect(data.userAgent).toBeNull()
  })
})

describe('recordConsent', () => {
  it('вызывает save с собранными данными ровно один раз', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    await recordConsent(
      {
        userId: 'u2',
        anonymousId: 'anon-1',
        acceptedAnalytics: true,
        acceptedMarketing: true,
        acceptedFunctional: true,
        consentVersion: 'v2',
      },
      fakeRequest({ 'x-forwarded-for': '203.0.113.2' }),
      save,
    )

    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u2', anonymousId: 'anon-1', consentVersion: 'v2' }),
    )
  })
})
