/**
 * Гонка публикации аниме (POST /api/anime): два параллельных запроса с одинаковым
 * directoryCid должны создать только одну запись — второй получает 409, не 500.
 * Уникальность (Anime.directoryCid @unique) ловит catch в route.ts через ZenStack v3
 * ORM db-query-error/23505, а не Prisma-код P2002 — см. §99 CHANGELOG этой сессии.
 */

import { NextRequest } from 'next/server'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { prisma } from '@/lib/db'

let testUserId: string

vi.mock('@/lib/api-auth', () => ({
  verifyApiKey: vi.fn(async () => ({ id: testUserId, role: 'USER' })),
}))

vi.mock('@/lib/ipfs-resolver', () => ({
  resolveAnimeFromDirectory: vi.fn(async () => ({ manifest: {}, animeInfo: null, episodes: [] })),
  extractAnimeMetadata: vi.fn(() => ({
    title: 'Тестовое аниме — гонка публикации',
    titleOriginal: null,
    description: null,
    coverUrl: undefined,
    year: null,
    studio: null,
    genres: [],
    shikimoriId: null,
    malId: null,
    anilistId: null,
    ageRating: null,
    episodes: [],
  })),
  resolveFranchiseKey: vi.fn(async () => null),
  resolveRelations: vi.fn(async () => []),
}))

vi.mock('@/lib/voice-acting', () => ({
  updateVoiceActingFromIpfs: vi.fn(async () => ({ updated: false, codes: [] })),
}))

// route.ts импортирует isValidCid из '@/lib/ipfs', который реэкспортирует
// '@letar/animatrona-utils' — под vitest этот workspace-пакет не забандлен в
// node_modules (резолвится только через customConditions Next.js), поэтому мокаем
// весь модуль, а не только реэкспорт.
vi.mock('@/lib/ipfs', () => ({
  isValidCid: vi.fn((cid: string) => /^bafy[a-z2-7]{50,}$/.test(cid) || /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cid)),
}))

// Тот же класс проблемы: '@/lib/redis' импортирует '@letar/redis-client', не
// забандленный под vitest. POST не вызывает cached() — мокаем для резолва импорта.
vi.mock('@/lib/redis', () => ({
  cached: vi.fn((_key: string, _ttl: number, fn: () => unknown) => fn()),
}))

const { POST } = await import('./route')

/** Валидный по regex CIDv1 (bafy + [a-z2-7]{50,}) с уникальным хвостом на запуск теста */
function makeCid(uniquePart: string) {
  const safe = uniquePart.replace(/[0189]/g, (d) => ({ '0': 'a', '1': 'b', '8': 'c', '9': 'd' })[d] ?? 'x')
  return `bafy${safe.padEnd(50, 'q')}`
}

function buildRequest(directoryCid: string) {
  return new NextRequest('http://localhost/api/anime', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer at_test',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ directoryCid }),
  })
}

describe('POST /api/anime — дедуп гонки по directoryCid', () => {
  const animeIds: string[] = []

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: { email: `test-race-anime-${Date.now()}@example.com` },
    })
    testUserId = user.id
  })

  afterAll(async () => {
    await prisma.anime.deleteMany({ where: { id: { in: animeIds } } })
    await prisma.user.delete({ where: { id: testUserId } })
  })

  it('два параллельных вызова с одинаковым directoryCid создают только одну запись', async () => {
    const directoryCid = makeCid(Date.now().toString(36))

    const [first, second] = await Promise.all([buildRequest(directoryCid), buildRequest(directoryCid)].map(POST))
    const [firstBody, secondBody] = await Promise.all([first.json(), second.json()])

    const statuses = [first.status, second.status].sort()
    expect(statuses).toEqual([201, 409])

    const successBody = first.status === 201 ? firstBody : secondBody
    const conflictBody = first.status === 409 ? firstBody : secondBody

    animeIds.push(successBody.anime.id)

    expect(conflictBody.error).toMatch(/Конфликт уникальности/)

    const rows = await prisma.anime.findMany({ where: { directoryCid } })
    expect(rows).toHaveLength(1)
  })
})
