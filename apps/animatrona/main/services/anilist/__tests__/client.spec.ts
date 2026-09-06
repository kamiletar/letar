import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAniListCache, getAniListDescription } from '../client'

function mockFetchOnce(body: unknown, ok = true): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      statusText: ok ? 'OK' : 'Internal Server Error',
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    }),
  )
}

describe('getAniListDescription', () => {
  beforeEach(() => {
    clearAniListCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('возвращает null, если не передан ни anilistId, ни malId', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const result = await getAniListDescription({})

    expect(result).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('запрашивает по id, если передан anilistId', async () => {
    mockFetchOnce({ data: { Media: { id: 101, idMal: 555, description: 'Synopsis EN' } } })

    const promise = getAniListDescription({ anilistId: 101 })
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result).toEqual({ id: 101, idMal: 555, description: 'Synopsis EN' })
    const [, requestInit] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(requestInit.body as string)
    expect(body.variables).toEqual({ id: 101 })
  })

  it('запрашивает по idMal, если anilistId не передан', async () => {
    mockFetchOnce({ data: { Media: { id: 202, idMal: 777, description: 'Another synopsis' } } })

    const promise = getAniListDescription({ malId: 777 })
    await vi.runAllTimersAsync()
    const result = await promise

    expect(result?.idMal).toBe(777)
    const [, requestInit] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    const body = JSON.parse(requestInit.body as string)
    expect(body.variables).toEqual({ idMal: 777 })
  })

  it('возвращает закэшированный результат повторно без нового fetch', async () => {
    mockFetchOnce({ data: { Media: { id: 101, idMal: 555, description: 'Synopsis EN' } } })

    const first = getAniListDescription({ anilistId: 101 })
    await vi.runAllTimersAsync()
    await first

    const fetchMock = fetch as ReturnType<typeof vi.fn>
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const second = await getAniListDescription({ anilistId: 101 })

    expect(second).toEqual({ id: 101, idMal: 555, description: 'Synopsis EN' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('clearAniListCache() снимает кэш — следующий вызов снова идёт в сеть', async () => {
    mockFetchOnce({ data: { Media: { id: 101, idMal: 555, description: 'v1' } } })
    const first = getAniListDescription({ anilistId: 101 })
    await vi.runAllTimersAsync()
    await first

    clearAniListCache()
    mockFetchOnce({ data: { Media: { id: 101, idMal: 555, description: 'v2' } } })

    const second = getAniListDescription({ anilistId: 101 })
    await vi.runAllTimersAsync()
    const result = await second

    expect(result?.description).toBe('v2')
  })

  it('возвращает null, если Media не найден на AniList', async () => {
    mockFetchOnce({ data: { Media: null } })

    const promise = getAniListDescription({ anilistId: 999 })
    await vi.runAllTimersAsync()

    expect(await promise).toBeNull()
  })

  it('бросает исключение при неуспешном HTTP-ответе (перехватывается вызывающим кодом non-fatally)', async () => {
    mockFetchOnce({}, false)

    // Хендлер (`.rejects`) вешается синхронно в этом же тике, чтобы избежать
    // предупреждения об unhandled rejection при последующем runAllTimersAsync()
    const assertion = expect(getAniListDescription({ anilistId: 1 })).rejects.toThrow('AniList API error')
    await vi.runAllTimersAsync()
    await assertion
  })

  it('бросает исключение при GraphQL errors в ответе', async () => {
    mockFetchOnce({ errors: [{ message: 'Invalid variables' }] })

    const assertion = expect(getAniListDescription({ anilistId: 1 })).rejects.toThrow('AniList GraphQL errors')
    await vi.runAllTimersAsync()
    await assertion
  })
})
