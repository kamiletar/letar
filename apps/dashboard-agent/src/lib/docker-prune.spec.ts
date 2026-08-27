import { beforeEach, describe, expect, it, vi } from 'vitest'

const pruneImages = vi.fn(async () => ({ ImagesDeleted: [], SpaceReclaimed: 0 }))

/**
 * Билдер-кэш чистится не через `docker.pruneBuilder()` (dockerode не умеет фильтры), а
 * прямым вызовом `/build/prune` через modem — мок повторяет callback-контракт modem.dial.
 */
let dialResponse: unknown = { SpaceReclaimed: 0 }
let dialError: Error | null = null
const dial = vi.fn(
  (_opts: { path: string; method: string }, cb: (err: Error | null, data: unknown) => void) => {
    cb(dialError, dialResponse)
  },
)

vi.mock('./docker', () => ({
  docker: {
    pruneImages: (...args: unknown[]) => pruneImages(...(args as [])),
    modem: {
      dial: (...args: unknown[]) =>
        dial(...(args as [{ path: string; method: string }, (err: Error | null, data: unknown) => void])),
    },
  },
}))

const { runDockerPrune } = await import('./docker-prune')

describe('runDockerPrune', () => {
  beforeEach(() => {
    pruneImages.mockClear()
    dial.mockClear()
    pruneImages.mockResolvedValue({ ImagesDeleted: [], SpaceReclaimed: 0 })
    dialResponse = { SpaceReclaimed: 0 }
    dialError = null
  })

  it('суммирует освобождённое место из images и builder', async () => {
    pruneImages.mockResolvedValue({
      ImagesDeleted: [{ Deleted: 'sha256:a' }, { Untagged: 'app:old' }],
      SpaceReclaimed: 1000,
    })
    dialResponse = { SpaceReclaimed: 500 }

    const result = await runDockerPrune()

    expect(result.imagesDeleted).toBe(2)
    expect(result.imagesReclaimedBytes).toBe(1000)
    expect(result.builderReclaimedBytes).toBe(500)
  })

  it('без dangling-образов и кэша — нули, без падения', async () => {
    const result = await runDockerPrune()

    expect(result.imagesDeleted).toBe(0)
    expect(result.imagesReclaimedBytes).toBe(0)
    expect(result.builderReclaimedBytes).toBe(0)
  })

  it('вызывает pruneImages без -a (только dangling) — без опций фильтрации', async () => {
    await runDockerPrune()

    expect(pruneImages).toHaveBeenCalledWith()
  })

  it('чистит build cache фильтром until, а не целиком', async () => {
    await runDockerPrune()

    const [opts] = dial.mock.calls[0] as [{ path: string; method: string }]
    expect(opts.method).toBe('POST')
    expect(opts.path).toContain('/build/prune?')

    const filters = new URLSearchParams(opts.path.split('?')[1]).get('filters')
    expect(JSON.parse(filters ?? '{}')).toEqual({ until: ['168h'] })
  })

  it('пустой ответ modem не роняет прогон', async () => {
    dialResponse = undefined

    const result = await runDockerPrune()

    expect(result.builderReclaimedBytes).toBe(0)
  })
})
