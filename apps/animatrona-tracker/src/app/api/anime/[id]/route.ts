/**
 * GET /api/anime/[id] — Получить детали аниме с эпизодами
 *
 * Публичный эндпоинт — возвращает только PUBLISHED аниме.
 */

import { getEnhancedPrisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type Params = Promise<{ id: string }>

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const { id } = await params

  const db = getEnhancedPrisma(null) // Анонимный доступ (только PUBLISHED)

  try {
    const anime = await db.anime.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        titleOriginal: true,
        description: true,
        coverUrl: true,
        directoryCid: true,
        shikimoriId: true,
        year: true,
        studio: true,
        genres: true,
        episodes: {
          orderBy: { number: 'asc' },
          select: {
            id: true,
            number: true,
            title: true,
            duration: true,
            videoCid: true,
          },
        },
        sourceRelations: {
          select: {
            targetShikimoriId: true,
            targetAnimeId: true,
            relationKind: true,
          },
        },
      },
    })

    if (!anime) {
      return NextResponse.json({ error: 'Аниме не найдено' }, { status: 404 })
    }

    const { sourceRelations, ...animeData } = anime

    return NextResponse.json(
      { data: { ...animeData, relations: sourceRelations } },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    )
  } catch (error) {
    console.error('Ошибка получения аниме:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
