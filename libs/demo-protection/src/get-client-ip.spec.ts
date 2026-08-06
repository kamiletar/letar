import { describe, expect, it, vi } from 'vitest'

const { headersMock } = vi.hoisted(() => ({ headersMock: vi.fn() }))

vi.mock('next/headers', () => ({
  headers: headersMock,
}))

/** Создаёт мок заголовков запроса с методом `get`, как у Next.js `Headers`. */
function mockHeaders(values: Record<string, string>) {
  return {
    get: (name: string) => values[name] ?? null,
  }
}

// Свежий импорт после каждого vi.mock/резолва — headers() смокан выше модульно
async function importGetClientIp() {
  const { getClientIp } = await import('./get-client-ip')
  return getClientIp
}

describe('getClientIp', () => {
  it('берёт IP из x-forwarded-for, когда он единственный', async () => {
    headersMock.mockResolvedValue(mockHeaders({ 'x-forwarded-for': '203.0.113.1' }))
    const getClientIp = await importGetClientIp()

    await expect(getClientIp()).resolves.toBe('203.0.113.1')
  })

  it('берёт первый IP из цепочки x-forwarded-for (реальный клиент)', async () => {
    headersMock.mockResolvedValue(
      mockHeaders({ 'x-forwarded-for': '203.0.113.1, 70.41.3.18, 150.172.238.178' }),
    )
    const getClientIp = await importGetClientIp()

    await expect(getClientIp()).resolves.toBe('203.0.113.1')
  })

  it('обрезает пробелы вокруг первого IP в цепочке', async () => {
    headersMock.mockResolvedValue(mockHeaders({ 'x-forwarded-for': '  203.0.113.1  , 70.41.3.18' }))
    const getClientIp = await importGetClientIp()

    await expect(getClientIp()).resolves.toBe('203.0.113.1')
  })

  it('падает на x-real-ip, если x-forwarded-for отсутствует', async () => {
    headersMock.mockResolvedValue(mockHeaders({ 'x-real-ip': '198.51.100.7' }))
    const getClientIp = await importGetClientIp()

    await expect(getClientIp()).resolves.toBe('198.51.100.7')
  })

  it('игнорирует пустую строку x-forwarded-for и падает на x-real-ip', async () => {
    headersMock.mockResolvedValue(mockHeaders({ 'x-forwarded-for': '', 'x-real-ip': '198.51.100.7' }))
    const getClientIp = await importGetClientIp()

    await expect(getClientIp()).resolves.toBe('198.51.100.7')
  })

  it('возвращает "unknown", если оба заголовка отсутствуют', async () => {
    headersMock.mockResolvedValue(mockHeaders({}))
    const getClientIp = await importGetClientIp()

    await expect(getClientIp()).resolves.toBe('unknown')
  })
})
