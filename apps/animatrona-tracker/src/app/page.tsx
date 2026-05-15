import { prisma } from '@/lib/db'
import { cached } from '@/lib/redis'
import { HomePageClient } from './_components/home-page-client'

/** Тип для счётчика жанров */
export interface GenreCount {
  genre: string
  count: number
}

/** Счётчики жанров — SQL агрегация, кэш 5 мин */
function getGenreCounts() {
  return cached('anime:genres', 300, async () => {
    return prisma.$queryRaw<GenreCount[]>`
      SELECT unnest(genres) as genre, COUNT(*)::int as count
      FROM "Anime"
      WHERE status = 'PUBLISHED'
      GROUP BY genre
      ORDER BY count DESC
    `
  })
}

/** Общее число опубликованных аниме, кэш 5 мин */
function getTotalCount() {
  return cached('anime:total', 300, async () => {
    return prisma.anime.count({ where: { status: 'PUBLISHED' } })
  })
}

/** Последние добавленные аниме, кэш 2 мин */
function getLatestAnime() {
  return cached('anime:latest', 120, async () => {
    return prisma.anime.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        title: true,
        coverUrl: true,
        shikimoriId: true,
        year: true,
        genres: true,
        _count: { select: { episodes: true } },
      },
    })
  })
}

/**
 * Главная страница Animatrona Tracker
 * Server Component — загружает данные для home page
 */
export default async function HomePage() {
  const [genreCounts, totalCount, latestAnime] = await Promise.all([
    getGenreCounts(),
    getTotalCount(),
    getLatestAnime(),
  ])

  return <HomePageClient genreCounts={genreCounts} totalCount={totalCount} latestAnime={latestAnime} />
}

export const metadata = {
  title: 'Animatrona — Децентрализованная платформа аниме',
  description: 'Смотрите аниме через IPFS без ограничений. Каталог, плеер, франшизы, прогресс просмотра.',
}
