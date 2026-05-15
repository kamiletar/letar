'use server'

import { prisma as db } from '@/lib/db'

/**
 * Тип для счётчиков фильтров
 * Каждый ключ — значение фильтра, значение — количество аниме
 */
export interface FilterCounts {
  status: Record<string, number>
  year: Record<string, number>
  watchStatus: Record<string, number>
  resolution: Record<string, number>
  bitDepth: Record<string, number>
}

/**
 * Получить счётчики для всех фильтров (faceted search)
 * Возвращает количество аниме для каждого значения каждого фильтра
 */
export async function getFilterCounts(): Promise<FilterCounts> {
  // Параллельно запускаем все groupBy запросы
  const [statusCounts, yearCounts, watchStatusCounts, resolutionData, bitDepthData] = await Promise.all([
    // Статус аниме
    db.anime.groupBy({
      by: ['status'],
      _count: { id: true },
    }),

    // Год выпуска
    db.anime.groupBy({
      by: ['year'],
      _count: { id: true },
      where: { year: { not: null } },
    }),

    // Статус просмотра
    db.anime.groupBy({
      by: ['watchStatus'],
      _count: { id: true },
    }),

    // Разрешение — через episodes (подсчитываем уникальные anime)
    db.$queryRaw<{ resolution: string; count: number }[]>`
      SELECT
        CASE
          WHEN MAX(e.videoHeight) >= 2160 THEN '4k'
          WHEN MAX(e.videoHeight) >= 1080 THEN '1080p'
          ELSE '720p'
        END as resolution,
        COUNT(DISTINCT a.id) as count
      FROM Anime a
      JOIN Episode e ON e.animeId = a.id
      WHERE e.videoHeight IS NOT NULL
      GROUP BY CASE
        WHEN e.videoHeight >= 2160 THEN '4k'
        WHEN e.videoHeight >= 1080 THEN '1080p'
        ELSE '720p'
      END
    `,

    // Битность — через episodes
    db.$queryRaw<{ bitDepth: string; count: number }[]>`
      SELECT
        CASE
          WHEN MAX(e.videoBitDepth) >= 10 THEN '10'
          ELSE '8'
        END as bitDepth,
        COUNT(DISTINCT a.id) as count
      FROM Anime a
      JOIN Episode e ON e.animeId = a.id
      WHERE e.videoBitDepth IS NOT NULL
      GROUP BY CASE
        WHEN e.videoBitDepth >= 10 THEN '10'
        ELSE '8'
      END
    `,
  ])

  // Преобразуем в удобный формат
  const result: FilterCounts = {
    status: {},
    year: {},
    watchStatus: {},
    resolution: {},
    bitDepth: {},
  }

  // Статус
  for (const row of statusCounts) {
    result.status[row.status] = row._count.id
  }

  // Год
  for (const row of yearCounts) {
    if (row.year) {
      result.year[String(row.year)] = row._count.id
    }
  }

  // Статус просмотра
  for (const row of watchStatusCounts) {
    result.watchStatus[row.watchStatus] = row._count.id
  }

  // Разрешение
  for (const row of resolutionData) {
    result.resolution[row.resolution] = Number(row.count)
  }

  // Битность
  for (const row of bitDepthData) {
    result.bitDepth[row.bitDepth] = Number(row.count)
  }

  return result
}

/** Тип для доступных значений фильтров */
export interface AvailableItem {
  id: string
  name: string
}

/**
 * Получить жанры, которые есть хотя бы у одного аниме в библиотеке
 */
export async function getAvailableGenres(): Promise<AvailableItem[]> {
  return db.genre.findMany({
    where: {
      animes: { some: {} },
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

// v0.28.0: getAvailableStudios удалён — студии теперь в AnimeManifest (IPFS)

/**
 * Получить локальные группы озвучки из аудиодорожек (из AudioTrack.dubGroup)
 * В отличие от Fandubber (данные из Shikimori), это реальные локальные озвучки
 */
export async function getLocalDubGroups(): Promise<AvailableItem[]> {
  const tracks = await db.audioTrack.findMany({
    where: { dubGroup: { not: null } },
    select: { dubGroup: true },
    distinct: ['dubGroup'],
    orderBy: { dubGroup: 'asc' },
  })
  return tracks
    .filter((t): t is { dubGroup: string } => !!t.dubGroup)
    .map((t) => ({
      id: t.dubGroup,
      name: t.dubGroup,
    }))
}

// v0.28.0: getAvailableDirectors удалён — режиссёры теперь в AnimeManifest (IPFS)
