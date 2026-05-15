/**
 * API: GET /api/user/watch-progress — Получить прогресс просмотра пользователя
 *
 * Query: ?since=ISO_TIMESTAMP — вернуть только обновленные после since
 * Аутентификация: API Key (Bearer) или сессия
 */

import { verifyApiKey } from '@/lib/api-auth'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Аутентификация: API Key или сессия
  const apiKeyUser = await verifyApiKey(request)
  const session = apiKeyUser ? null : await getSession()
  const user = apiKeyUser ?? session?.user

  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = request.nextUrl.searchParams.get('since')
  let sinceDate: Date | undefined
  if (since) {
    const parsed = new Date(since)
    if (isNaN(parsed.getTime())) {
      return NextResponse.json({ error: 'Невалидный формат since (ожидается ISO 8601)' }, { status: 400 })
    }
    sinceDate = parsed
  }

  // Находим все записи библиотеки пользователя с прогрессом
  const items = await prisma.userLibraryItem.findMany({
    where: {
      userId: user.id,
      watchProgress: sinceDate ? { some: { updatedAt: { gt: sinceDate } } } : undefined,
    },
    select: {
      anime: {
        select: {
          id: true,
          directoryCid: true,
          shikimoriId: true,
        },
      },
      watchProgress: {
        where: sinceDate ? { updatedAt: { gt: sinceDate } } : undefined,
        select: {
          episodeNumber: true,
          currentTime: true,
          duration: true,
          completed: true,
          updatedAt: true,
        },
        orderBy: { episodeNumber: 'asc' },
      },
    },
  })

  // Плоский список прогресса с метаданными аниме
  const result = items.flatMap((item) =>
    item.watchProgress.map((wp) => ({
      animeId: item.anime.id,
      directoryCid: item.anime.directoryCid ?? undefined,
      shikimoriId: item.anime.shikimoriId,
      episodeNumber: wp.episodeNumber,
      currentTime: wp.currentTime,
      duration: wp.duration,
      completed: wp.completed,
      updatedAt: wp.updatedAt.toISOString(),
    }))
  )

  return NextResponse.json({ items: result })
}
