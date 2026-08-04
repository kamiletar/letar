/**
 * GET /api/rss/feed.xml
 *
 * RSS 2.0 фид с последними опубликованными аниме.
 * Кэш 15 минут, публичный.
 */

import { prisma } from '@/lib/db'
import { generateRssXml, type RssItem } from '@/lib/rss'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://animatrona-tracker.letar.best'

export async function GET() {
  const anime = await prisma.anime.findMany({
    where: { status: 'PUBLISHED' },
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

  const xml = generateRssXml({
    title: 'Animatrona Tracker — Новые релизы',
    description: 'Последние аниме релизы с IPFS раздачами',
    link: SITE_URL,
    feedUrl: `${SITE_URL}/api/rss/feed.xml`,
    items,
  })

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
    },
  })
}
