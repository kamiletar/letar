import { getAgeGroup, getAllowedRatings } from '@/lib/age-rating'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { cached } from '@/lib/redis'
import { AnimeCatalogClient } from './_components/anime-catalog-client'

/** Тип для счётчика жанров */
interface GenreCount {
  genre: string
  count: number
}

/** Тип для счётчика WatchStatus */
interface WatchStatusCount {
  watchStatus: string
  count: number
}

/** Тип для счётчика студий */
interface StudioCount {
  studio: string
  count: number
}

/** Тип для счётчика режиссёров */
interface DirectorCount {
  director: string
  count: number
}

/** Жанры со счётчиками — Redis кэш 5 мин */
function getCachedGenreCounts() {
  return cached('anime:genres:catalog', 300, async () => {
    return prisma.$queryRaw<GenreCount[]>`
      SELECT unnest(genres) as genre, COUNT(*)::int as count
      FROM "Anime"
      WHERE status = 'PUBLISHED'
      GROUP BY genre
      ORDER BY count DESC, genre ASC
    `
  })
}

/** Студии со счётчиками — Redis кэш 5 мин */
function getCachedStudios() {
  return cached('anime:studios:catalog', 300, async () => {
    return prisma.$queryRaw<StudioCount[]>`
      SELECT studio, COUNT(*)::int as count
      FROM "Anime"
      WHERE status = 'PUBLISHED' AND studio IS NOT NULL AND studio != ''
      GROUP BY studio
      ORDER BY count DESC, studio ASC
    `
  })
}

/** Режиссёры со счётчиками — Redis кэш 5 мин */
function getCachedDirectors() {
  return cached('anime:directors:catalog', 300, async () => {
    return prisma.$queryRaw<DirectorCount[]>`
      SELECT director, COUNT(*)::int as count
      FROM "Anime"
      WHERE status = 'PUBLISHED' AND director IS NOT NULL AND director != ''
      GROUP BY director
      ORDER BY count DESC, director ASC
    `
  })
}

/** Данные франшиз: представители и скрытые ID */
interface FranchiseData {
  /** ID представителей (первый по году в каждой группе) */
  representativeIds: string[]
  /** ID аниме скрытых (не-представители) */
  hiddenIds: string[]
  /** Количество тайтлов в каждой франшизе: representativeId → count */
  counts: Record<string, number>
}

/**
 * Группировка франшиз через connected components по AnimeRelation.
 * Возвращает представителей и скрытых. Кэш 5 мин.
 */
function getCachedFranchiseData() {
  return cached('anime:franchise-data:v3', 300, async () => {
    const animeWithFranchise = await prisma.anime.findMany({
      where: { status: 'PUBLISHED', franchiseKey: { not: null } },
      select: { id: true, franchiseKey: true, year: true },
      orderBy: { year: 'asc' },
    })

    const groups = new Map<string, Array<{ id: string; year: number | null }>>()
    for (const a of animeWithFranchise) {
      if (!a.franchiseKey) {
        continue
      }
      if (!groups.has(a.franchiseKey)) {
        groups.set(a.franchiseKey, [])
      }
      groups.get(a.franchiseKey)!.push({ id: a.id, year: a.year })
    }

    const representativeIds: string[] = []
    const hiddenIds: string[] = []
    const counts: Record<string, number> = {}

    for (const members of groups.values()) {
      if (members.length < 2) {
        continue
      }
      members.sort((a, b) => (a.year || 9999) - (b.year || 9999))
      const rep = members[0].id
      representativeIds.push(rep)
      counts[rep] = members.length
      for (let i = 1; i < members.length; i++) {
        hiddenIds.push(members[i].id)
      }
    }

    return { representativeIds, hiddenIds, counts } satisfies FranchiseData
  })
}

interface AnimePageProps {
  searchParams: Promise<{
    q?: string
    genre?: string
    year?: string
    yearFrom?: string
    yearTo?: string
    page?: string
    sort?: string
    view?: string
    rating?: string
    studio?: string
    director?: string
    epFrom?: string
    epTo?: string
    watchStatus?: string
    /** Список voiceActing кодов через запятую: DUB_RU,SUB_EN */
    voice?: string
  }>
}

/**
 * Страница каталога аниме
 * Серверный компонент для загрузки данных
 */
export default async function AnimePage({ searchParams }: AnimePageProps) {
  const params = await searchParams
  const session = await getSession()
  const db = getEnhancedPrisma(session?.user)

  const page = parseInt(params.page || '1', 10)
  const limit = 20
  const skip = (page - 1) * limit

  // Поиск по названию, оригинальному названию, описанию, студии, режиссёру
  const titleFilter = params.q
    ? {
      OR: [
        { title: { contains: params.q, mode: 'insensitive' as const } },
        { titleOriginal: { contains: params.q, mode: 'insensitive' as const } },
        { description: { contains: params.q, mode: 'insensitive' as const } },
        { studio: { contains: params.q, mode: 'insensitive' as const } },
        { director: { contains: params.q, mode: 'insensitive' as const } },
      ],
    }
    : {}

  const genreFilter = params.genre ? { genres: { has: params.genre } } : {}

  // Год: поддерживаем как одиночный year, так и диапазон yearFrom/yearTo
  let yearFilter = {}
  if (params.yearFrom || params.yearTo) {
    const yearCondition: { gte?: number; lte?: number } = {}
    if (params.yearFrom) {
      yearCondition.gte = parseInt(params.yearFrom, 10)
    }
    if (params.yearTo) {
      yearCondition.lte = parseInt(params.yearTo, 10)
    }
    yearFilter = { year: yearCondition }
  } else if (params.year) {
    yearFilter = { year: parseInt(params.year, 10) }
  }

  // Возрастной рейтинг: пользовательский выбор ИЛИ автоматический по возрасту
  const allowedRatings = getAllowedRatings(session?.user?.birthDate)
  let ageRatingFilter = {}
  if (params.rating) {
    // Пользователь выбрал конкретный рейтинг — показываем только его
    // Но не позволяем выбрать рейтинг выше разрешённого
    if (!allowedRatings || allowedRatings.includes(params.rating)) {
      ageRatingFilter = { ageRating: params.rating }
    } else {
      ageRatingFilter = { ageRating: { in: allowedRatings } }
    }
  } else if (allowedRatings) {
    ageRatingFilter = { ageRating: { in: allowedRatings } }
  }

  // Студия
  const studioFilter = params.studio ? { studio: { contains: params.studio, mode: 'insensitive' as const } } : {}

  // Режиссёр
  const directorFilter = params.director
    ? { director: { contains: params.director, mode: 'insensitive' as const } }
    : {}

  // Фильтр по количеству эпизодов (через подзапрос)
  let episodeCountFilter = {}
  if (params.epFrom || params.epTo) {
    const epFrom = params.epFrom ? parseInt(params.epFrom, 10) : 0
    const epTo = params.epTo ? parseInt(params.epTo, 10) : 999999
    const idsWithEpCount = await prisma.$queryRaw<{ id: string }[]>`
      SELECT a.id FROM "Anime" a
      LEFT JOIN "AnimeEpisode" e ON e."animeId" = a.id
      WHERE a.status = 'PUBLISHED'
      GROUP BY a.id
      HAVING COUNT(e.id)::int >= ${epFrom} AND COUNT(e.id)::int <= ${epTo}
    `
    episodeCountFilter = { id: { in: idsWithEpCount.map((r) => r.id) } }
  }

  // Фильтр по озвучке/субтитрам (voiceActing массив строк)
  const voiceCodes = params.voice ? params.voice.split(',').filter(Boolean) : []
  const voiceActingFilter = voiceCodes.length > 0 ? { voiceActing: { hasEvery: voiceCodes } } : {}

  // Фильтр по статусу просмотра (только для авторизованных)
  let watchStatusFilter = {}
  if (session?.user && params.watchStatus) {
    const libraryItems = await db.userLibraryItem.findMany({
      where: { userId: session.user.id, watchStatus: params.watchStatus as never },
      select: { animeId: true },
    })
    watchStatusFilter = { id: { in: libraryItems.map((i) => i.animeId) } }
  }

  // В режиме franchise скрываем не-представителей франшиз
  let franchiseHiddenFilter = {}
  let franchiseCounts: Record<string, number> = {}
  if (params.view === 'franchise') {
    const data = await getCachedFranchiseData()
    if (data.hiddenIds.length > 0) {
      franchiseHiddenFilter = { id: { notIn: data.hiddenIds } }
    }
    franchiseCounts = data.counts
  }

  const where = {
    status: 'PUBLISHED' as const,
    ...titleFilter,
    ...genreFilter,
    ...yearFilter,
    ...ageRatingFilter,
    ...studioFilter,
    ...directorFilter,
    ...episodeCountFilter,
    ...watchStatusFilter,
    ...voiceActingFilter,
    ...franchiseHiddenFilter,
  }

  // Сортировка
  const orderBy = params.sort === 'popular'
    ? { viewCount: 'desc' as const }
    : params.sort === 'rating'
    ? { avgRating: 'desc' as const }
    : params.sort === 'title'
    ? { title: 'asc' as const }
    : { createdAt: 'desc' as const }

  // Счётчики WatchStatus для авторизованных пользователей
  let watchStatusCounts: WatchStatusCount[] = []
  if (session?.user) {
    watchStatusCounts = await cached(
      `anime:watch-status:${session.user.id}`,
      60,
      () =>
        prisma.$queryRaw<WatchStatusCount[]>`
        SELECT "watchStatus", COUNT(*)::int as count
        FROM "UserLibraryItem"
        WHERE "userId" = ${session.user.id}
        GROUP BY "watchStatus"
        ORDER BY count DESC
      `,
    )
  }

  // Загружаем данные параллельно
  const [animeList, total, genreCounts, studios, directors] = await Promise.all([
    db.anime.findMany({
      where,
      orderBy,
      take: limit,
      skip,
      select: {
        id: true,
        title: true,
        titleOriginal: true,
        coverUrl: true,
        directoryCid: true,
        shikimoriId: true,
        franchiseKey: true,
        year: true,
        studio: true,
        director: true,
        genres: true,
        ageRating: true,
        createdAt: true,
        viewCount: true,
        avgRating: true,
        _count: {
          select: { episodes: true },
        },
        uploadedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    db.anime.count({ where }),
    getCachedGenreCounts(),
    getCachedStudios(),
    getCachedDirectors(),
  ]).catch((error) => {
    console.error('[anime/page] Promise.all failed', { params, error })
    throw error
  })

  const totalPages = Math.ceil(total / limit)

  return (
    <AnimeCatalogClient
      animeList={animeList}
      total={total}
      page={page}
      totalPages={totalPages}
      query={params.q || ''}
      genre={params.genre || ''}
      year={params.year || ''}
      yearFrom={params.yearFrom || ''}
      yearTo={params.yearTo || ''}
      sort={params.sort || ''}
      view={params.view || ''}
      rating={params.rating || ''}
      studio={params.studio || ''}
      director={params.director || ''}
      epFrom={params.epFrom || ''}
      epTo={params.epTo || ''}
      watchStatus={params.watchStatus || ''}
      voice={params.voice || ''}
      genreCounts={genreCounts}
      studios={studios}
      directors={directors}
      franchiseCounts={franchiseCounts}
      watchStatusCounts={watchStatusCounts}
      isAuthenticated={!!session?.user}
      allowedRatings={allowedRatings}
      ageGroup={getAgeGroup(session?.user?.birthDate)}
    />
  )
}

export const metadata = {
  title: 'Каталог аниме',
  description: 'Просмотр и поиск аниме контента на Animatrona Tracker',
}
