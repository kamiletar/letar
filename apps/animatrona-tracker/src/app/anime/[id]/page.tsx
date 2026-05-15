import { getSession } from '@/lib/auth'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { resolveImageUrl } from '@/lib/ipfs'
import { loadAnimeManifestData } from '@/lib/manifest-loader'
import { getOnlineSeedCount } from '@/lib/redis-distributions'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { AnimePageClient } from './_components/anime-page-client'
import type { SimilarAnimeItem } from './_components/similar-section'

interface AnimeDetailPageProps {
  params: Promise<{ id: string }>
}

/**
 * Найти аниме по slug: сначала по shikimoriId (число), потом по id (CUID).
 * Обёрнуто в React.cache() для дедупликации между page() и generateMetadata().
 */
const findAnimeBySlug = cache(async (slug: string, user?: Parameters<typeof getEnhancedPrisma>[0]) => {
  const db = getEnhancedPrisma(user)

  // Если slug — число, ищем по shikimoriId (PUBLISHED приоритет)
  const shikimoriId = parseInt(slug, 10)
  if (!Number.isNaN(shikimoriId) && String(shikimoriId) === slug) {
    const anime = await db.anime.findFirst({
      where: { shikimoriId, status: 'PUBLISHED' },
      include: {
        episodes: { orderBy: { number: 'asc' } },
        uploadedBy: { select: { id: true, name: true, image: true } },
      },
    })
    if (anime) {
      return anime
    }
  }

  // Если slug начинается с Qm/bafy — ищем по directoryCid
  if (slug.startsWith('Qm') || slug.startsWith('bafy')) {
    const anime = await db.anime.findFirst({
      where: { directoryCid: slug },
      include: {
        episodes: { orderBy: { number: 'asc' } },
        uploadedBy: { select: { id: true, name: true, image: true } },
      },
    })
    if (anime) {
      return anime
    }
  }

  // Fallback — поиск по id (CUID)
  return db.anime.findUnique({
    where: { id: slug },
    include: {
      episodes: { orderBy: { number: 'asc' } },
      uploadedBy: { select: { id: true, name: true, image: true } },
    },
  })
})

/**
 * Построить libraryMap: shikimoriId → slug для внутренних ссылок
 * между связанными аниме в трекере.
 * Кешируется в Redis на 5 минут — меняется только при публикации/удалении аниме.
 */
async function getCachedLibraryMap(): Promise<Record<string, string>> {
  const { cached } = await import('@/lib/redis')
  return cached('anime:library-map', 300, async () => {
    const db = getEnhancedPrisma()
    const publishedAnime = await db.anime.findMany({
      where: { status: 'PUBLISHED', shikimoriId: { not: null } },
      select: { shikimoriId: true },
    })

    const map: Record<string, string> = {}
    for (const a of publishedAnime) {
      if (a.shikimoriId) {
        map[String(a.shikimoriId)] = String(a.shikimoriId)
      }
    }
    return map
  })
}

/**
 * Найти похожие аниме по пересечению жанров.
 * Ранжирование: больше совпавших жанров → выше в списке.
 */
async function findSimilarAnime(animeId: string, genres: string[], limit = 12): Promise<SimilarAnimeItem[]> {
  if (genres.length === 0) {
    return []
  }

  // Raw SQL: считаем пересечение жанров и сортируем по релевантности
  const rows = await prisma.$queryRaw<
    Array<{
      id: string
      title: string
      titleOriginal: string | null
      coverUrl: string | null
      year: number | null
      studio: string | null
      genres: string[]
      shikimoriId: number | null
      episodeCount: bigint
      matchingGenres: bigint
    }>
  >`
    SELECT
      a.id,
      a.title,
      a."titleOriginal",
      a."coverUrl",
      a.year,
      a.studio,
      a.genres,
      a."shikimoriId",
      (SELECT COUNT(*)::bigint FROM "AnimeEpisode" e WHERE e."animeId" = a.id) as "episodeCount",
      (SELECT COUNT(*)::bigint FROM unnest(a.genres) g WHERE g = ANY(${genres}::text[])) as "matchingGenres"
    FROM "Anime" a
    WHERE a.status = 'PUBLISHED'
      AND a.id != ${animeId}
      AND a.genres && ${genres}::text[]
    ORDER BY "matchingGenres" DESC, a.year DESC NULLS LAST
    LIMIT ${limit}
  `

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    titleOriginal: r.titleOriginal,
    coverUrl: r.coverUrl,
    year: r.year,
    studio: r.studio,
    genres: r.genres,
    shikimoriId: r.shikimoriId,
    episodeCount: Number(r.episodeCount),
    matchingGenres: Number(r.matchingGenres),
  }))
}

/**
 * Страница детальной информации об аниме.
 *
 * Загружает данные из БД + IPFS-манифест (параллельно).
 * Slug может быть shikimoriId (число) или id (CUID) — для стабильных ссылок.
 */
export default async function AnimeDetailPage({ params }: AnimeDetailPageProps) {
  const { id: slug } = await params
  const session = await getSession()

  const anime = await findAnimeBySlug(slug, session?.user)

  if (!anime) {
    notFound()
  }

  // Определяем slug для URL: PUBLISHED → shikimoriId, остальные → directoryCid
  const animeSlug =
    anime.status === 'PUBLISHED' && anime.shikimoriId ? String(anime.shikimoriId) : (anime.directoryCid ?? anime.id)

  // Параллельная загрузка: манифест из IPFS + libraryMap из БД + похожие аниме + комментарии + сиды
  const db = getEnhancedPrisma(session?.user)
  const [manifestResult, libraryMap, similarAnime, commentCount, onlineSeedCount] = await Promise.all([
    anime.directoryCid ? loadAnimeManifestData(anime.directoryCid).catch(() => null) : null,
    getCachedLibraryMap(),
    findSimilarAnime(anime.id, anime.genres),
    db.animeComment.count({ where: { animeId: anime.id } }),
    getOnlineSeedCount(anime.id),
  ])

  // Преобразуем Map → Record для сериализации (Server → Client)
  const previewMapRecord: Record<string, { thumbnailCids: string[]; screenshotCids: string[] }> = {}
  if (manifestResult?.previewMap) {
    for (const [k, v] of manifestResult.previewMap) {
      previewMapRecord[String(k)] = v
    }
  }

  return (
    <AnimePageClient
      anime={{
        id: anime.id,
        title: anime.title,
        titleOriginal: anime.titleOriginal,
        description: anime.description,
        coverUrl: anime.coverUrl,

        year: anime.year,
        studio: anime.studio,
        genres: anime.genres,
        status: anime.status,
        shikimoriId: anime.shikimoriId,
        directoryCid: anime.directoryCid ?? null,
        viewCount: anime.viewCount,
        libraryCount: anime.libraryCount,
        avgRating: anime.avgRating,
        episodes: anime.episodes.map((ep) => ({
          id: ep.id,
          number: ep.number,
          title: ep.title,
          duration: ep.duration,
          videoCid: ep.videoCid,
        })),
        uploadedBy: anime.uploadedBy,
      }}
      manifestData={{
        manifest: manifestResult?.manifest ?? null,
        relations: manifestResult?.relations ?? [],
        franchiseGraph: manifestResult?.franchiseGraph ?? null,
        previewMap: previewMapRecord,
        videos: manifestResult?.manifest?.videos ?? [],
      }}
      libraryMap={libraryMap}
      similarAnime={similarAnime}
      animeSlug={animeSlug}
      isAuthenticated={!!session?.user}
      userId={session?.user?.id}
      userRole={session?.user?.role}
      commentCount={commentCount}
      onlineSeedCount={onlineSeedCount}
    />
  )
}

export async function generateMetadata({ params }: AnimeDetailPageProps): Promise<Metadata> {
  const { id: slug } = await params

  const anime = await findAnimeBySlug(slug)

  if (!anime) {
    return { title: 'Аниме не найдено' }
  }

  const title = anime.titleOriginal ? `${anime.title} / ${anime.titleOriginal}` : anime.title

  return {
    title,
    description: anime.description || `Смотреть ${anime.title} на Animatrona Tracker`,
    openGraph: {
      title,
      description: anime.description || `Смотреть ${anime.title} на Animatrona Tracker`,
      images: anime.coverUrl ? [resolveImageUrl(anime.coverUrl)] : undefined,
    },
  }
}
