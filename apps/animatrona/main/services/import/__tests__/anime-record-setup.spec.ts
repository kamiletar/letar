import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ImportQueueParsedInfo, ImportQueueSelectedAnime } from '../../../../shared/types/import-queue'

vi.mock('../import-db', () => ({
  animeExistsByShikimoriId: vi.fn(),
  upsertAnime: vi.fn(),
}))

// shikimori/client.ts импортирует `app` из electron — недоступно в vitest node-окружении.
// createAnimeRecord() его не вызывает, поэтому мок-заглушки достаточно.
vi.mock('../../shikimori/client', () => ({
  downloadPoster: vi.fn(),
}))

// import-ipfs.ts → unixfs-service.ts → unified-ipfs-service.ts → import-queue-controller.ts →
// app.handlers.ts → library-migration.ts → utils/db.ts (читает electron `app.isPackaged` на
// верхнем уровне модуля) — цепочка транзитивных импортов, недоступная в vitest node-окружении.
// createAnimeRecord() uploadToIpfs() не вызывает, мок-заглушки достаточно.
vi.mock('../import-ipfs', () => ({
  uploadToIpfs: vi.fn(),
}))

import { createAnimeRecord } from '../anime-record-setup'
import * as db from '../import-db'

function makeSelectedAnime(overrides: Partial<ImportQueueSelectedAnime> = {}): ImportQueueSelectedAnime {
  return {
    id: '123',
    name: 'Test Anime',
    russian: 'Тестовое аниме',
    description: null,
    descriptionHtml: null,
    posterUrl: null,
    kind: 'tv',
    status: 'released',
    episodes: 12,
    airedOn: '2024-01-01',
    ...overrides,
  }
}

function makeParsedInfo(overrides: Partial<ImportQueueParsedInfo> = {}): ImportQueueParsedInfo {
  return {
    animeName: 'Test Anime',
    seasonNumber: 1,
    subGroup: null,
    quality: null,
    original: 'Test Anime [1080p]',
    source: 'folder',
    ...overrides,
  }
}

describe('createAnimeRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('isNewlyCreated=true, если под этим shikimoriId ещё не было записи', async () => {
    vi.mocked(db.animeExistsByShikimoriId).mockResolvedValue(false)
    vi.mocked(db.upsertAnime).mockResolvedValue({ id: 'anime-1' } as never)

    const result = await createAnimeRecord(makeSelectedAnime(), makeParsedInfo(), '/library/Test Anime')

    expect(result).toEqual({ id: 'anime-1', isNewlyCreated: true })
    expect(db.animeExistsByShikimoriId).toHaveBeenCalledWith(123)
  })

  it('isNewlyCreated=false, если запись под этим shikimoriId уже существовала (Блокер 1)', async () => {
    vi.mocked(db.animeExistsByShikimoriId).mockResolvedValue(true)
    vi.mocked(db.upsertAnime).mockResolvedValue({ id: 'anime-existing' } as never)

    const result = await createAnimeRecord(makeSelectedAnime(), makeParsedInfo(), '/library/Test Anime')

    // Вызывающий код (import-service.ts) обязан НЕ ставить createdAnimeId при false —
    // иначе откат неудачного импорта удалит уже существовавшее аниме со всей историей просмотра.
    expect(result).toEqual({ id: 'anime-existing', isNewlyCreated: false })
  })

  it('передаёт rating из selectedAnime.score в upsertAnime (Блокер 3)', async () => {
    vi.mocked(db.animeExistsByShikimoriId).mockResolvedValue(false)
    vi.mocked(db.upsertAnime).mockResolvedValue({ id: 'anime-1' } as never)

    await createAnimeRecord(makeSelectedAnime({ score: 8.5 }), makeParsedInfo(), '/library/Test Anime')

    expect(db.upsertAnime).toHaveBeenCalledWith(expect.objectContaining({ rating: 8.5 }))
  })

  it('rating=null, если score отсутствует', async () => {
    vi.mocked(db.animeExistsByShikimoriId).mockResolvedValue(false)
    vi.mocked(db.upsertAnime).mockResolvedValue({ id: 'anime-1' } as never)

    await createAnimeRecord(makeSelectedAnime(), makeParsedInfo(), '/library/Test Anime')

    expect(db.upsertAnime).toHaveBeenCalledWith(expect.objectContaining({ rating: null }))
  })
})
