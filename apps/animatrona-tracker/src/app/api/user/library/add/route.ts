/**
 * API: POST /api/user/library/add — Добавить аниме в библиотеку
 *
 * Добавляет аниме по ID в библиотеку пользователя.
 * Аутентификация: API Key (Bearer) или сессия.
 */

import { verifyApiKey } from '@/lib/api-auth'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Аутентификация: API Key или сессия
  const apiKeyUser = await verifyApiKey(request)
  const session = apiKeyUser ? null : await getSession()
  const user = apiKeyUser ?? session?.user

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.animeId || typeof body.animeId !== 'string') {
    return NextResponse.json({ error: 'Ожидается { animeId: string }' }, { status: 400 })
  }

  // Проверяем что аниме существует и опубликовано
  const anime = await prisma.anime.findFirst({
    where: {
      id: body.animeId,
      status: 'PUBLISHED',
    },
    select: {
      id: true,
      title: true,
      directoryCid: true,
    },
  })

  if (!anime) {
    return NextResponse.json({ error: 'Аниме не найдено' }, { status: 404 })
  }

  // Upsert — если уже в библиотеке, просто возвращаем
  const libraryItem = await prisma.userLibraryItem.upsert({
    where: {
      userId_animeId: {
        userId: user.id,
        animeId: anime.id,
      },
    },
    create: {
      userId: user.id,
      animeId: anime.id,
      watchStatus: 'PLANNED',
      pinnedLocally: false,
    },
    update: {
      // Не перезаписываем существующие данные
    },
    include: {
      anime: {
        select: {
          id: true,
          title: true,
          directoryCid: true,
          shikimoriId: true,
        },
      },
    },
  })

  // Инкрементальное обновление libraryCount
  try {
    const libraryCount = await prisma.userLibraryItem.count({
      where: { animeId: anime.id },
    })
    await prisma.anime.update({
      where: { id: anime.id },
      data: { libraryCount },
    })
  } catch {
    // Не критично — пересчитаем при recalc-stats
  }

  return NextResponse.json({
    success: true,
    data: libraryItem,
  })
}
