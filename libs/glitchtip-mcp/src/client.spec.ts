import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./config.js', () => ({
  glitchtipUrl: () => 'https://glitchtip.test',
  glitchtipOrg: () => 'kami',
  glitchtipToken: () => 'test-token',
}))

import { getLatestIssueEvent, setIssueStatus } from './client.js'

describe('client', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
  })

  describe('setIssueStatus', () => {
    it('шлёт PUT /api/0/issues/{id}/ с JSON-телом { status } и Bearer-токеном', async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: '771', status: 'ignored' }), { status: 200 }))

      const issue = await setIssueStatus('771', 'ignored')

      expect(issue.status).toBe('ignored')
      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe('https://glitchtip.test/api/0/issues/771/')
      expect(init.method).toBe('PUT')
      expect(init.body).toBe(JSON.stringify({ status: 'ignored' }))
      expect(init.headers).toMatchObject({ Authorization: 'Bearer test-token', 'Content-Type': 'application/json' })
    })

    it('ответ 403 (токену не хватает прав на запись) — ошибка с кодом и телом', async () => {
      fetchMock.mockResolvedValue(new Response('{"detail":"forbidden"}', { status: 403 }))

      await expect(setIssueStatus('771', 'resolved')).rejects.toThrow(/HTTP 403.*forbidden/)
    })
  })

  describe('чтение остаётся GET без тела', () => {
    it('getLatestIssueEvent не шлёт метод записи и Content-Type', async () => {
      fetchMock.mockResolvedValue(new Response('{"eventID":"e1"}', { status: 200 }))

      await getLatestIssueEvent('771')

      const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(init.method).toBe('GET')
      expect(init.body).toBeUndefined()
      expect(init.headers).not.toHaveProperty('Content-Type')
    })
  })
})
