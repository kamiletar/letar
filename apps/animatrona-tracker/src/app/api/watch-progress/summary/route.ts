/**
 * API сводки прогресса просмотра для карточек каталога
 *
 * GET /api/watch-progress/summary — прогресс по всем аниме текущего пользователя
 * Возвращает Record<animeId, { watchedEpisodes, lastEpisode, lastEpisodeProgress }>
 */

import { verifyApiKey } from '@/lib/api-auth'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export interface WatchProgressSummaryItem {
  /** Количество завершённых эпизодов */
  watchedEpisodes: number
  /** Последний просмотренный эпизод (незавершённый) */
  lastEpisode: number | null
  /** Прогресс последнего эпизода (0-100) */
  lastEpisodeProgress: number
}

export async function GET(request: NextRequest) {
  // Аутентификация: API Key или сессия
  const apiKeyUser = await verifyApiKey(request)
  const session = apiKeyUser ? null : await getSession()
  const user = apiKeyUser ?? session?.user

  if (!user?.id) {
    return NextResponse.json({ data: {} })
  }

  const db = getEnhancedPrisma(user)

  // Получаем записи библиотеки с прогрессом
  const libraryItems = await db.userLibraryItem.findMany({
    where: {
      userId: user.id,
      watchProgress: { some: {} },
    },
    select: {
      animeId: true,
      watchProgress: {
        select: {
          episodeNumber: true,
          currentTime: true,
          duration: true,
          completed: true,
        },
      },
    },
  })

  // Группируем по animeId
  const summaryMap: Record<string, WatchProgressSummaryItem> = {}

  for (const li of libraryItems) {
    const summary: WatchProgressSummaryItem = {
      watchedEpisodes: 0,
      lastEpisode: null,
      lastEpisodeProgress: 0,
    }

    for (const p of li.watchProgress) {
      if (p.completed) {
        summary.watchedEpisodes++
      } else if (p.currentTime > 0) {
        // Считаем lastEpisode даже без duration (mobile может не отправлять duration)
        if (summary.lastEpisode === null || p.episodeNumber > summary.lastEpisode) {
          summary.lastEpisode = p.episodeNumber
          summary.lastEpisodeProgress = p.duration > 0
            ? Math.min(Math.round((p.currentTime / p.duration) * 100), 100)
            : -1 // -1 = прогресс неизвестен (duration не передан)
        }
      }
    }

    summaryMap[li.animeId] = summary
  }

  return NextResponse.json({ data: summaryMap })
}
