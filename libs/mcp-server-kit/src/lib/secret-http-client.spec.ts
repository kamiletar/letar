import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSecretHttpClient } from './secret-http-client.js'

function stubFetch(body: string, status = 200) {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(body, { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const request = createSecretHttpClient({
  baseUrl: () => 'https://studio.example.com',
  secretHeaderName: 'X-Test-Secret',
  secret: () => 's3cret',
  serviceLabel: 'studio',
})

describe('createSecretHttpClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('не переиспользует соединение (keepalive: false)', async () => {
    // Регресс 2026-10-27: после рестарта Traefik долгоживущий MCP-процесс брал из пула мёртвый
    // keep-alive сокет и получал «404 page not found», затем ECONNRESET.
    const fetchMock = stubFetch('{"data":[]}')

    await request({ path: '/api/mcp/admin/recurring' })

    const init = fetchMock.mock.calls[0]?.[1]
    expect(init?.keepalive).toBe(false)
  })

  it('собирает URL с query, пропуская пустые значения, и шлёт секретный заголовок', async () => {
    const fetchMock = stubFetch('{"data":[]}')

    await request({ path: '/api/x', query: { clientId: 'c1', status: undefined } })

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('https://studio.example.com/api/x?clientId=c1')
    expect((init?.headers as Record<string, string>)['X-Test-Secret']).toBe('s3cret')
  })

  it('HTTP-ошибку с JSON-телом возвращает как ok: false, а не бросает', async () => {
    stubFetch('{"error":"not found"}', 404)

    await expect(request({ path: '/api/x' })).resolves.toEqual({
      ok: false,
      status: 404,
      json: { error: 'not found' },
    })
  })

  it('на не-JSON ответ бросает с кодом и началом тела', async () => {
    stubFetch('404 page not found', 404)

    await expect(request({ path: '/api/x' })).rejects.toThrow(
      'studio вернул не-JSON (HTTP 404) на /api/x: 404 page not found',
    )
  })
})
