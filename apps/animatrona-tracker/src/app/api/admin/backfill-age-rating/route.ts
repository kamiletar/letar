/**
 * POST /api/admin/backfill-age-rating — Заполнить ageRating из IPFS для существующих аниме
 *
 * Для каждого аниме без ageRating загружает manifest → animeInfo → извлекает ageRating.
 * Только для ADMIN.
 */

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { extractAnimeMetadata, resolveAnimeFromDirectory } from '@/lib/ipfs-resolver'
import { NextResponse } from 'next/server'

export async function POST() {
  const session = await getSession()
  if (!session?.user || (session.user as { role: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Находим аниме без ageRating, у которых есть directoryCid
  const animeWithoutRating = await prisma.anime.findMany({
    where: { ageRating: null, directoryCid: { not: null } },
    select: { id: true, title: true, directoryCid: true },
  })

  const results: { id: string; title: string; ageRating: string | null; error?: string }[] = []

  for (const anime of animeWithoutRating) {
    try {
      const resolved = await resolveAnimeFromDirectory(anime.directoryCid!)
      const metadata = extractAnimeMetadata(resolved)

      if (metadata.ageRating) {
        await prisma.anime.update({
          where: { id: anime.id },
          data: { ageRating: metadata.ageRating },
        })
        results.push({ id: anime.id, title: anime.title, ageRating: metadata.ageRating })
      } else {
        results.push({ id: anime.id, title: anime.title, ageRating: null })
      }
    } catch (err) {
      results.push({
        id: anime.id,
        title: anime.title,
        ageRating: null,
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  const updated = results.filter((r) => r.ageRating && !r.error).length
  const failed = results.filter((r) => r.error).length

  return NextResponse.json({
    total: animeWithoutRating.length,
    updated,
    failed,
    noRating: animeWithoutRating.length - updated - failed,
    results,
  })
}
