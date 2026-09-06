import { describe, expect, it, vi } from 'vitest'

// anime-manifest-generator.ts импортирует `prisma` из utils/db.ts, а тот на верхнем уровне модуля
// читает `app.isPackaged` из electron — недоступно в vitest node-окружении. Тестируем только
// чистую функцию isFranchiseGraphStale, поэтому реальный prisma/electron не нужен вовсе.
vi.mock('../../utils/db', () => ({ prisma: {} }))
vi.mock('../ipfs/pin-sub-documents', () => ({ pinSubDocuments: vi.fn() }))
vi.mock('../ipfs/unixfs-service', () => ({ addBytes: vi.fn(), cat: vi.fn() }))
vi.mock('../kubo', () => ({ getKuboService: vi.fn() }))
vi.mock('../shikimori', () => ({ getAnimeExtended: vi.fn(), getAnimeRestData: vi.fn(), getAnimeWithRelated: vi.fn() }))
vi.mock('../shikimori/franchise-api', () => ({ getFranchiseGraph: vi.fn() }))
vi.mock('../anime-info-generator', () => ({ buildAnimeInfo: vi.fn() }))
vi.mock('../ipfs/image-uploader', () => ({ prewarmCache: vi.fn(), uploadImageToIpfs: vi.fn() }))

const { FRANCHISE_GRAPH_TTL_MS, isFranchiseGraphStale } = await import('../anime-manifest-generator')

describe('isFranchiseGraphStale', () => {
  it('устарел, если graphUpdatedAt не задан (графа ещё не было)', () => {
    expect(isFranchiseGraphStale(null)).toBe(true)
    expect(isFranchiseGraphStale(undefined)).toBe(true)
  })

  it('не устарел, если обновлён только что', () => {
    expect(isFranchiseGraphStale(new Date())).toBe(false)
  })

  it('не устарел на границе TTL минус запас', () => {
    const almostStale = new Date(Date.now() - (FRANCHISE_GRAPH_TTL_MS - 60_000))
    expect(isFranchiseGraphStale(almostStale)).toBe(false)
  })

  it('устарел, если обновлён более недели назад', () => {
    const stale = new Date(Date.now() - (FRANCHISE_GRAPH_TTL_MS + 60_000))
    expect(isFranchiseGraphStale(stale)).toBe(true)
  })
})
