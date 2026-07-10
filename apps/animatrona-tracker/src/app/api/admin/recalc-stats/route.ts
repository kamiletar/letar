/**
 * POST /api/admin/recalc-stats — Пересчёт всех денормализованных счётчиков
 *
 * Пересчитывает:
 * - Anime: viewCount, libraryCount, avgRating
 * - User: uploaderScore, uploaderRank
 *
 * Оптимизировано: batch SQL UPDATE вместо N отдельных UPDATE
 *
 * Доступ: только ADMIN
 */

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { invalidate } from '@/lib/redis'
import { calculateUploaderScore, getRank } from '@/lib/uploader-score'
import { NextResponse } from 'next/server'

export async function POST() {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 1. Batch UPDATE viewCount — один SQL вместо N отдельных UPDATE
  const animeViewResult = await prisma.$executeRaw`
    UPDATE "Anime" a
    SET "viewCount" = COALESCE(sub.cnt, 0)
    FROM (
      SELECT uli."animeId", COUNT(DISTINCT uli.id)::int as cnt
      FROM "UserLibraryItem" uli
      WHERE EXISTS (SELECT 1 FROM "UserWatchProgress" uwp WHERE uwp."libraryItemId" = uli.id)
      GROUP BY uli."animeId"
    ) sub
    WHERE a.id = sub."animeId" AND a.status = 'PUBLISHED'
  `

  // 2. Batch UPDATE libraryCount
  await prisma.$executeRaw`
    UPDATE "Anime" a
    SET "libraryCount" = COALESCE(sub.cnt, 0)
    FROM (
      SELECT "animeId", COUNT(*)::int as cnt
      FROM "UserLibraryItem"
      GROUP BY "animeId"
    ) sub
    WHERE a.id = sub."animeId" AND a.status = 'PUBLISHED'
  `

  // 3. Batch UPDATE avgRating
  await prisma.$executeRaw`
    UPDATE "Anime" a
    SET "avgRating" = sub.avg_rating
    FROM (
      SELECT "animeId", ROUND(AVG("userRating")::numeric, 1)::float as avg_rating
      FROM "UserLibraryItem"
      WHERE "userRating" > 0
      GROUP BY "animeId"
    ) sub
    WHERE a.id = sub."animeId" AND a.status = 'PUBLISHED'
  `

  // Обнулить счётчики для аниме без данных
  await prisma.$executeRaw`
    UPDATE "Anime"
    SET "viewCount" = 0
    WHERE status = 'PUBLISHED' AND id NOT IN (
      SELECT DISTINCT uli."animeId" FROM "UserLibraryItem" uli
      JOIN "UserWatchProgress" uwp ON uwp."libraryItemId" = uli.id
    )
  `

  // 4. Пересчёт uploaderScore — загружаем все аниме одним запросом
  const uploaders = await prisma.anime.groupBy({
    by: ['uploadedById'],
    where: { status: 'PUBLISHED' },
    _count: { id: true },
  })

  // Загружаем агрегаты по загрузчикам одним запросом
  const uploaderIds = uploaders.map((u) => u.uploadedById)

  const [allUploaderAnime, allDistStats] = await Promise.all([
    prisma.anime.findMany({
      where: { uploadedById: { in: uploaderIds }, status: 'PUBLISHED' },
      select: { uploadedById: true, viewCount: true, libraryCount: true, avgRating: true },
    }),
    prisma.distributionStats.findMany({
      where: { userId: { in: uploaderIds } },
      select: { userId: true, totalBytesUploaded: true },
    }),
  ])

  // Агрегируем в памяти (десятки загрузчиков, не тысячи)
  const distStatsMap = new Map(allDistStats.map((d) => [d.userId, d]))
  const uploaderAnimeMap = new Map<
    string,
    { totalViewers: number; totalLibraryAdds: number; avgUserRating: number | null }
  >()

  for (const anime of allUploaderAnime) {
    const existing = uploaderAnimeMap.get(anime.uploadedById) ?? {
      totalViewers: 0,
      totalLibraryAdds: 0,
      ratings: [] as number[],
    }
    existing.totalViewers += anime.viewCount
    existing.totalLibraryAdds += anime.libraryCount
    if (anime.avgRating !== null) {
      ;(existing as unknown as { ratings: number[] }).ratings.push(anime.avgRating)
    }
    uploaderAnimeMap.set(anime.uploadedById, existing as never)
  }

  let usersUpdated = 0
  for (const uploader of uploaders) {
    const userId = uploader.uploadedById
    const animeAgg = uploaderAnimeMap.get(userId) as
      { totalViewers: number; totalLibraryAdds: number; ratings: number[] } | undefined
    const distStats = distStatsMap.get(userId)

    const avgUserRating =
      animeAgg && animeAgg.ratings.length > 0
        ? animeAgg.ratings.reduce((sum, r) => sum + r, 0) / animeAgg.ratings.length
        : null

    const score = calculateUploaderScore({
      publishedAnimeCount: uploader._count.id,
      totalViewers: animeAgg?.totalViewers ?? 0,
      totalLibraryAdds: animeAgg?.totalLibraryAdds ?? 0,
      avgUserRating,
      totalBytesUploaded: Number(distStats?.totalBytesUploaded ?? 0),
    })

    const rank = getRank(score)

    await prisma.user.update({
      where: { id: userId },
      data: { uploaderScore: score, uploaderRank: rank },
    })
    usersUpdated++
  }

  // 5. Инвалидируем кэши
  await invalidate('leaderboard:*', 'profile:*', 'api:anime:*')

  return NextResponse.json({
    ok: true,
    animeUpdated: animeViewResult,
    usersUpdated,
  })
}
