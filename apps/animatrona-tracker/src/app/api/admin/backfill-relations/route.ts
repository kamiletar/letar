/**
 * POST /api/admin/backfill-relations — Заполнить AnimeRelation для всех PUBLISHED аниме
 *
 * Загружает franchise graph из IPFS для каждого аниме с directoryCid,
 * извлекает связи и сохраняет в AnimeRelation таблицу.
 *
 * Доступ: только ADMIN
 */

import { verifyApiKey } from '@/lib/api-auth'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getIpfsUrl } from '@/lib/ipfs'
import { fetchIpfsJson } from '@/lib/ipfs-fetch'
import { resolveRelations } from '@/lib/ipfs-resolver'
import type { AnimeManifest } from '@letar/animatrona-types'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Аутентификация: API Key или сессия
  const apiKeyUser = await verifyApiKey(request)
  const session = apiKeyUser ? null : await getSession()
  const user = apiKeyUser ?? session?.user

  if (!user || (user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Все PUBLISHED аниме с directoryCid и shikimoriId
  const animeList = await prisma.anime.findMany({
    where: {
      status: 'PUBLISHED',
      directoryCid: { not: null },
      shikimoriId: { not: null },
    },
    select: {
      id: true,
      directoryCid: true,
      shikimoriId: true,
    },
  })

  // Маппинг shikimoriId → animeId для быстрого lookup
  const shikimoriToAnimeId = new Map(animeList.filter((a) => a.shikimoriId).map((a) => [a.shikimoriId!, a.id]))

  const results: Array<{ id: string; relations: number; error?: string }> = []

  for (const anime of animeList) {
    try {
      // Загружаем manifest.json
      const manifestUrl = getIpfsUrl(anime.directoryCid!) + '/manifest.json'
      const manifest = await fetchIpfsJson<AnimeManifest>(manifestUrl)

      // Извлекаем связи
      const relations = await resolveRelations(manifest, anime.shikimoriId)

      if (relations.length > 0) {
        // Удаляем старые и создаём новые
        await prisma.$transaction([
          prisma.animeRelation.deleteMany({ where: { animeId: anime.id } }),
          ...relations.map((r) =>
            prisma.animeRelation.create({
              data: {
                animeId: anime.id,
                targetShikimoriId: r.targetShikimoriId,
                targetAnimeId: shikimoriToAnimeId.get(r.targetShikimoriId) ?? null,
                relationKind: r.relationKind,
              },
            })
          ),
        ])
      }

      results.push({ id: anime.id, relations: relations.length })
    } catch (error) {
      results.push({
        id: anime.id,
        relations: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const totalRelations = results.reduce((sum, r) => sum + r.relations, 0)
  const errors = results.filter((r) => r.error)

  return NextResponse.json({
    success: true,
    processed: results.length,
    totalRelations,
    errors: errors.length,
    details: errors.length > 0 ? errors : undefined,
  })
}
