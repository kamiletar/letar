import { beforeEach, describe, expect, it, vi } from 'vitest'

const pruneImages = vi.fn(async () => ({ ImagesDeleted: [], SpaceReclaimed: 0 }))
const pruneBuilder = vi.fn(async () => ({ SpaceReclaimed: 0 }))

vi.mock('./docker', () => ({
  docker: {
    pruneImages: (...args: unknown[]) => pruneImages(...(args as [])),
    pruneBuilder: (...args: unknown[]) => pruneBuilder(...(args as [])),
  },
}))

const { runDockerPrune } = await import('./docker-prune')

describe('runDockerPrune', () => {
  beforeEach(() => {
    pruneImages.mockClear()
    pruneBuilder.mockClear()
    pruneImages.mockResolvedValue({ ImagesDeleted: [], SpaceReclaimed: 0 })
    pruneBuilder.mockResolvedValue({ SpaceReclaimed: 0 })
  })

  it('суммирует освобождённое место из images и builder', async () => {
    pruneImages.mockResolvedValue({
      ImagesDeleted: [{ Deleted: 'sha256:a' }, { Untagged: 'app:old' }],
      SpaceReclaimed: 1000,
    })
    pruneBuilder.mockResolvedValue({ SpaceReclaimed: 500 })

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
    expect(pruneBuilder).toHaveBeenCalledWith()
  })
})
