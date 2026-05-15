/**
 * GET /api/rss/genre/[slug]
 *
 * RSS 2.0 фид по жанру. slug — название жанра (например "Экшен", "Фэнтези").
 * Кэш 15 минут, публичный.
 */

import { prisma } from '@/lib/db'
import { generateRssXml, type RssItem } from '@/lib/rss'
import { type NextRequest, NextResponse } from 'next/server'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://animatrona-tracker.letar.best'

type Params = Promise<{ slug: string }>

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const { slug } = await params
  const genre = decodeURIComponent(slug)

  // Проверяем что жанр существует
  const count = await prisma.anime.count({
    where: {
      status: 'PUBLISHED',
      genres: { has: genre },
    },
  })

  if (count === 0) {
    return NextResponse.json({ error: `Жанр "${genre}" не найден` }, { status: 404 })
  }

  const anime = await prisma.anime.findMany({
    where: {
      status: 'PUBLISHED',
      genres: { has: genre },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      titleOriginal: true,
      year: true,
      genres: true,
      coverUrl: true,
      createdAt: true,
      episodes: { select: { id: true } },
    },
  })

  const items: RssItem[] = anime.map((a) => {
    const genreList = a.genres.length > 0 ? a.genres.join(', ') : ''
    const epCount = a.episodes.length
    const parts = [a.year && `${a.year}`, epCount > 0 && `${epCount} эп.`, genreList].filter(Boolean)
    const description = parts.join(' · ')

    return {
      title: a.titleOriginal ? `${a.title} / ${a.titleOriginal}` : a.title,
      link: `${SITE_URL}/anime/${a.id}`,
      description,
      pubDate: a.createdAt.toISOString(),
      guid: `${SITE_URL}/anime/${a.id}`,
      imageUrl: a.coverUrl ?? undefined,
      genres: a.genres,
    }
  })

  const feedUrl = `${SITE_URL}/api/rss/genre/${encodeURIComponent(genre)}`

  const xml = generateRssXml({
    title: `Animatrona Tracker — ${genre}`,
    description: `Аниме в жанре ${genre} с IPFS раздачами`,
    link: `${SITE_URL}/anime?genre=${encodeURIComponent(genre)}`,
    feedUrl,
    items,
  })

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
    },
  })
}
