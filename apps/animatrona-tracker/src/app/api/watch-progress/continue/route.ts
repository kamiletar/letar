/**
 * API для секции "Продолжить просмотр" на главной странице
 *
 * GET /api/watch-progress/continue — последние 10 незавершённых просмотров
 * Возвращает аниме + эпизод + прогресс для быстрого перехода в плеер.
 */

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { cached } from '@/lib/redis'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ items: [] })
  }

  const userId = session.user.id
  const db = getEnhancedPrisma(session.user)

  // Кэш 30 сек — инвалидируется при POST watch-progress
  const libraryItems = await cached(`user:${userId}:continue`, 30, () =>
    db.userLibraryItem.findMany({
      where: {
        userId: session.user.id,
        watchStatus: 'WATCHING',
        watchProgress: {
          some: { completed: false, currentTime: { gt: 0 } },
        },
      },
      select: {
        anime: {
          select: {
            id: true,
            title: true,
            coverUrl: true,
            shikimoriId: true,
          },
        },
        watchProgress: {
          where: { completed: false, currentTime: { gt: 0 } },
          orderBy: { updatedAt: 'desc' },
          take: 1,
          select: {
            episodeNumber: true,
            currentTime: true,
            duration: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    })
  )

  // Формируем ответ
  const items = libraryItems
    .filter((li) => li.watchProgress.length > 0)
    .map((li) => {
      const progress = li.watchProgress[0]!
      const animeSlug = li.anime.shikimoriId ? String(li.anime.shikimoriId) : li.anime.id
      return {
        animeId: li.anime.id,
        animeSlug,
        animeTitle: li.anime.title,
        coverUrl: li.anime.coverUrl,
        episodeNumber: progress.episodeNumber,
        currentTime: progress.currentTime,
        duration: progress.duration,
        updatedAt: progress.updatedAt,
      }
    })

  return NextResponse.json({ items })
}
