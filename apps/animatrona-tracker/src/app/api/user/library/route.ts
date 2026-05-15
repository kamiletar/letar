/**
 * API: GET /api/user/library — Получить библиотеку пользователя
 *
 * Возвращает все аниме в библиотеке с метаданными и прогрессом просмотра.
 * Аутентификация: API Key (Bearer) или сессия.
 */

import { verifyApiKey } from '@/lib/api-auth'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Аутентификация: API Key или сессия
  const apiKeyUser = await verifyApiKey(request)
  const session = apiKeyUser ? null : await getSession()
  const user = apiKeyUser ?? session?.user

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = getEnhancedPrisma(user)

  const items = await db.userLibraryItem.findMany({
    where: { userId: user.id },
    include: {
      anime: {
        select: {
          id: true,
          title: true,
          titleOriginal: true,
          coverUrl: true,
          directoryCid: true,
          shikimoriId: true,
          malId: true,
          anilistId: true,
          year: true,
          studio: true,
          genres: true,
          status: true,
          episodes: {
            select: { number: true, title: true, duration: true },
            orderBy: { number: 'asc' },
          },
        },
      },
      watchProgress: {
        select: {
          episodeNumber: true,
          currentTime: true,
          completed: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      },
      _count: { select: { watchProgress: true } },
    },
    orderBy: { addedAt: 'desc' },
  })

  return NextResponse.json({ data: items })
}

/**
 * DELETE /api/user/library?itemId=xxx — Удалить аниме из библиотеки
 */
export async function DELETE(request: NextRequest) {
  const apiKeyUser = await verifyApiKey(request)
  const session = apiKeyUser ? null : await getSession()
  const user = apiKeyUser ?? session?.user

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const itemId = request.nextUrl.searchParams.get('itemId')
  if (!itemId) {
    return NextResponse.json({ error: 'Ожидается itemId' }, { status: 400 })
  }

  const db = getEnhancedPrisma(user)

  // Проверяем что запись принадлежит пользователю
  const item = await db.userLibraryItem.findFirst({
    where: { id: itemId, userId: user.id },
  })

  if (!item) {
    return NextResponse.json({ error: 'Не найдено' }, { status: 404 })
  }

  const animeId = item.animeId
  await db.userLibraryItem.delete({ where: { id: itemId } })

  // Инкрементальное обновление libraryCount и avgRating
  try {
    const [libraryCount, ratingAgg] = await Promise.all([
      prisma.userLibraryItem.count({ where: { animeId } }),
      prisma.userLibraryItem.aggregate({
        where: { animeId, userRating: { gt: 0 } },
        _avg: { userRating: true },
        _count: { userRating: true },
      }),
    ])
    await prisma.anime.update({
      where: { id: animeId },
      data: {
        libraryCount,
        avgRating: ratingAgg._count.userRating > 0 ? Math.round((ratingAgg._avg.userRating ?? 0) * 10) / 10 : null,
      },
    })
  } catch {
    // Не критично
  }

  return NextResponse.json({ success: true })
}
