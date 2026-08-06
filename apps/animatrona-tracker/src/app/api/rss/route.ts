/**
 * GET /api/rss — RSS 2.0 фид новых аниме
 *
 * Последние 50 опубликованных аниме в формате RSS 2.0 XML.
 * Кэш Redis 15 мин. Content-Type: application/rss+xml.
 */

import { getEnhancedPrisma } from '@/lib/db'
import { resolveImageUrl } from '@/lib/ipfs'
import { cached } from '@/lib/redis'
import { NextResponse } from 'next/server'

const SITE_URL = 'https://animatrona-tracker.letar.best'
const FEED_TITLE = 'Animatrona Tracker — Новые аниме'
const FEED_DESCRIPTION = 'Последние аниме на Animatrona Tracker'

/** Экранирование XML спецсимволов */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const xml = await cached('rss:feed', 900, buildRssFeed)

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
    },
  })
}

async function buildRssFeed(): Promise<string> {
  const db = getEnhancedPrisma(null)

  const animeList = await db.anime.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      title: true,
      titleOriginal: true,
      description: true,
      coverUrl: true,
      year: true,
      studio: true,
      genres: true,
      shikimoriId: true,
      createdAt: true,
      _count: { select: { episodes: true } },
      uploadedBy: { select: { name: true } },
    },
  })

  const items = animeList.map((anime) => {
    const slug = anime.shikimoriId ?? anime.id
    const link = `${SITE_URL}/anime/${slug}`
    const pubDate = new Date(anime.createdAt).toUTCString()

    // Описание: год, студия, жанры, эпизоды
    const parts: string[] = []
    if (anime.titleOriginal) {
      parts.push(anime.titleOriginal)
    }
    if (anime.year) {
      parts.push(`${anime.year}`)
    }
    if (anime.studio) {
      parts.push(anime.studio)
    }
    if (anime.genres.length > 0) {
      parts.push(anime.genres.join(', '))
    }
    parts.push(`${anime._count.episodes} эп.`)
    if (anime.uploadedBy.name) {
      parts.push(`Загрузчик: ${anime.uploadedBy.name}`)
    }
    if (anime.description) {
      parts.push(anime.description.slice(0, 200))
    }

    const description = escapeXml(parts.join(' | '))
    const title = escapeXml(anime.title)
    const coverUrl = anime.coverUrl ? resolveImageUrl(anime.coverUrl) : null

    return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <description>${description}</description>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${link}</guid>${
      coverUrl
        ? `
      <enclosure url="${escapeXml(coverUrl)}" type="image/jpeg" />`
        : ''
    }
    </item>`
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${FEED_TITLE}</title>
    <link>${SITE_URL}</link>
    <description>${FEED_DESCRIPTION}</description>
    <language>ru</language>
    <atom:link href="${SITE_URL}/api/rss" rel="self" type="application/rss+xml"/>
${items.join('\n')}
  </channel>
</rss>`
}
