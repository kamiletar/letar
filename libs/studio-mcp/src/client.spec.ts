import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./config.js', () => ({
  studioUrl: () => 'https://studio.example',
  adminMcpSecret: () => 'test-secret',
}))

import { studioAdminRequest } from './client.js'

describe('studioAdminRequest', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('шлёт X-Admin-Mcp-Secret и возвращает ok:true с данными на успешный ответ', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'c1' } }), { status: 200 }),
    )

    const res = await studioAdminRequest({ path: '/api/mcp/admin/clients/c1' })

    expect(res.ok).toBe(true)
    expect(res.status).toBe(200)
    expect(res.json.data).toEqual({ id: 'c1' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://studio.example/api/mcp/admin/clients/c1')
    expect(init.headers['X-Admin-Mcp-Secret']).toBe('test-secret')
  })

  it('возвращает ok:false на HTTP 404 с валидным JSON-телом (ожидаемая ошибка, не throw)', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'клиент не найден' }), { status: 404 }),
    )

    const res = await studioAdminRequest({ path: '/api/mcp/admin/clients/missing' })

    expect(res.ok).toBe(false)
    expect(res.status).toBe(404)
    expect(res.json.error).toBe('клиент не найден')
  })

  it('бросает при сетевой ошибке', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(studioAdminRequest({ path: '/api/mcp/admin/clients' })).rejects.toThrow(
      'Не удалось достучаться до studio',
    )
  })

  it('бросает при не-JSON теле ответа', async () => {
    fetchMock.mockResolvedValue(new Response('<html>500</html>', { status: 500 }))

    await expect(studioAdminRequest({ path: '/api/mcp/admin/clients' })).rejects.toThrow(
      'вернул не-JSON',
    )
  })
})
