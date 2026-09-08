import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FolderPlayerHost, MediaProbeResult } from './host'
import { clearProbeCache, getCachedProbe, getProbeCacheStats, invalidateProbeCache } from './probe-cache'

/** Время жизни записи в кэше — сверено с CACHE_TTL_MS в probe-cache.ts */
const CACHE_TTL_MS = 30 * 60 * 1000
/** Лимит записей — сверено с MAX_CACHE_SIZE в probe-cache.ts */
const MAX_CACHE_SIZE = 100

const successResult: MediaProbeResult = { success: true, data: {} }
const failureResult: MediaProbeResult = { success: false, error: 'boom' }

function createHost(probeImpl: (filePath: string) => Promise<MediaProbeResult>): FolderPlayerHost {
  return { probe: vi.fn(probeImpl) } as unknown as FolderPlayerHost
}

describe('probe-cache', () => {
  beforeEach(() => {
    clearProbeCache()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('первый вызов реально вызывает host.probe', async () => {
    const host = createHost(async () => successResult)

    const result = await getCachedProbe(host, '/video/ep01.mkv')

    expect(result).toEqual(successResult)
    expect(host.probe).toHaveBeenCalledTimes(1)
  })

  it('повторный вызов с тем же путём берёт из кэша, host.probe не вызывается снова', async () => {
    const host = createHost(async () => successResult)

    await getCachedProbe(host, '/video/ep01.mkv')
    await getCachedProbe(host, '/video/ep01.mkv')

    expect(host.probe).toHaveBeenCalledTimes(1)
  })

  it('после истечения TTL повторный вызов снова бьёт в host.probe', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0))

    const host = createHost(async () => successResult)

    await getCachedProbe(host, '/video/ep01.mkv')
    expect(host.probe).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(CACHE_TTL_MS + 1000)

    await getCachedProbe(host, '/video/ep01.mkv')
    expect(host.probe).toHaveBeenCalledTimes(2)
  })

  it('до истечения TTL повторный вызов всё ещё берёт из кэша', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0))

    const host = createHost(async () => successResult)

    await getCachedProbe(host, '/video/ep01.mkv')
    vi.advanceTimersByTime(CACHE_TTL_MS - 1000)
    await getCachedProbe(host, '/video/ep01.mkv')

    expect(host.probe).toHaveBeenCalledTimes(1)
  })

  it('неуспешный результат не кэшируется — следующий вызов снова бьёт в host.probe', async () => {
    const host = createHost(async () => failureResult)

    const first = await getCachedProbe(host, '/video/ep01.mkv')
    const second = await getCachedProbe(host, '/video/ep01.mkv')

    expect(first).toEqual(failureResult)
    expect(second).toEqual(failureResult)
    expect(host.probe).toHaveBeenCalledTimes(2)
  })

  it('invalidateProbeCache инвалидирует конкретный путь, не трогая другие', async () => {
    const host = createHost(async () => successResult)

    await getCachedProbe(host, '/video/ep01.mkv')
    await getCachedProbe(host, '/video/ep02.mkv')
    expect(host.probe).toHaveBeenCalledTimes(2)

    invalidateProbeCache('/video/ep01.mkv')

    await getCachedProbe(host, '/video/ep01.mkv')
    expect(host.probe).toHaveBeenCalledTimes(3)

    // ep02 всё ещё в кэше — не должен снова бить в probe
    await getCachedProbe(host, '/video/ep02.mkv')
    expect(host.probe).toHaveBeenCalledTimes(3)
  })

  it('clearProbeCache очищает всё — getProbeCacheStats().size становится 0', async () => {
    const host = createHost(async () => successResult)

    await getCachedProbe(host, '/video/ep01.mkv')
    await getCachedProbe(host, '/video/ep02.mkv')
    expect(getProbeCacheStats().size).toBe(2)

    clearProbeCache()

    expect(getProbeCacheStats().size).toBe(0)
  })

  it('getProbeCacheStats: size растёт с добавлением успешных записей, maxSize равен константе', async () => {
    const host = createHost(async () => successResult)

    expect(getProbeCacheStats()).toEqual({ size: 0, maxSize: MAX_CACHE_SIZE })

    await getCachedProbe(host, '/video/ep01.mkv')
    expect(getProbeCacheStats().size).toBe(1)

    await getCachedProbe(host, '/video/ep02.mkv')
    expect(getProbeCacheStats().size).toBe(2)

    // Повторный вызов того же пути не увеличивает size
    await getCachedProbe(host, '/video/ep01.mkv')
    expect(getProbeCacheStats().size).toBe(2)

    expect(getProbeCacheStats().maxSize).toBe(MAX_CACHE_SIZE)
  })
})
