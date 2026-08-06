'use server'

/**
 * Server Actions для CRUD операций с WatchProgress
 * Отслеживание прогресса просмотра
 */

import type { Prisma, WatchProgress, WatchStatus } from '@/generated/prisma'
import { prisma } from '@/lib/db'
import { withDbRetry } from '@/lib/db-retry'
import { toPlayableUrl } from '@/lib/media-url'
import { findLastDiscoverWatched } from './discover-watch-progress.action'

// === READ ===

/**
 * Получить прогресс просмотра
 */
export async function findUniqueWatchProgress(
  animeId: string,
  episodeId: string,
  include?: Prisma.WatchProgressInclude,
): Promise<WatchProgress | null> {
  return prisma.watchProgress.findUnique({
    where: {
      animeId_episodeId: { animeId, episodeId },
    },
    include,
  })
}

/**
 * Получить весь прогресс по аниме
 */
export async function findWatchProgressByAnimeId(
  animeId: string,
  include?: Prisma.WatchProgressInclude,
): Promise<WatchProgress[]> {
  return prisma.watchProgress.findMany({
    where: { animeId },
    include,
    orderBy: { lastWatchedAt: 'desc' },
  })
}

/**
 * Получить последний просмотренный эпизод
 */
export async function findLastWatchedEpisode(animeId: string): Promise<WatchProgress | null> {
  return prisma.watchProgress.findFirst({
    where: { animeId },
    orderBy: { lastWatchedAt: 'desc' },
  })
}

// === UPSERT ===

/**
 * Создать или обновить прогресс просмотра
 */
export async function upsertWatchProgress(
  animeId: string,
  episodeId: string,
  data: Prisma.WatchProgressUncheckedUpdateInput,
): Promise<WatchProgress> {
  // retry при блокировке БД (конкуренция с импортом)
  return withDbRetry(() =>
    prisma.watchProgress.upsert({
      where: {
        animeId_episodeId: { animeId, episodeId },
      },
      create: {
        animeId,
        episodeId,
        currentTime: (data.currentTime as number) ?? 0,
        completed: (data.completed as boolean) ?? false,
        selectedAudioTrackId: data.selectedAudioTrackId as string | undefined,
        selectedSubtitleTrackId: data.selectedSubtitleTrackId as string | undefined,
        volume: (data.volume as number) ?? 1,
      },
      update: data,
    })
  )
}

// === UPDATE ===

/**
 * Обновить время просмотра
 */
export async function updateWatchTime(animeId: string, episodeId: string, currentTime: number): Promise<WatchProgress> {
  return prisma.watchProgress.update({
    where: {
      animeId_episodeId: { animeId, episodeId },
    },
    data: { currentTime },
  })
}

/**
 * Отметить эпизод как просмотренный
 */
export async function markEpisodeCompleted(animeId: string, episodeId: string): Promise<WatchProgress> {
  return prisma.watchProgress.update({
    where: {
      animeId_episodeId: { animeId, episodeId },
    },
    data: { completed: true },
  })
}

// === DELETE ===

/**
 * Удалить прогресс просмотра
 */
export async function deleteWatchProgress(
  animeId: string,
  episodeId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.watchProgress.delete({
      where: {
        animeId_episodeId: { animeId, episodeId },
      },
    })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

/**
 * Удалить весь прогресс по аниме
 */
export async function deleteWatchProgressByAnimeId(animeId: string): Promise<{ count: number }> {
  return prisma.watchProgress.deleteMany({ where: { animeId } })
}

// === ИСТОРИЯ ПРОСМОТРА (v0.9.0) ===

/**
 * Данные для карточки "Продолжить смотреть"
 */
export interface GlobalLastWatchedData {
  animeId: string
  animeName: string
  animePosterId: string | null
  episodeId: string
  episodeNumber: number
  episodeName: string | null
  currentTime: number
  durationMs: number | null
  completed: boolean
  lastWatchedAt: Date
}

/**
 * Получить последний просмотренный эпизод глобально
 * Для карточки "Продолжить смотреть" в Sidebar
 * Проверяет как библиотеку (WatchProgress), так и каталог (DiscoverWatchProgress)
 */
export async function findGlobalLastWatched(): Promise<GlobalLastWatchedData | null> {
  // Параллельно запрашиваем из обоих источников
  const [libraryProgress, discoverProgress] = await Promise.all([
    prisma.watchProgress.findFirst({
      where: {
        completed: false,
        currentTime: { gt: 10 },
      },
      orderBy: { lastWatchedAt: 'desc' },
      include: {
        anime: { select: { id: true, name: true, posterId: true } },
        episode: { select: { id: true, number: true, name: true, durationMs: true } },
      },
    }),
    findLastDiscoverWatched(),
  ])

  // Определяем самый свежий из двух
  const libraryTime = libraryProgress?.lastWatchedAt?.getTime() ?? 0
  const discoverTime = discoverProgress?.lastWatchedAt?.getTime() ?? 0

  if (discoverProgress && discoverTime > libraryTime) {
    // Каталог более свежий
    return {
      animeId: discoverProgress.trackerAnimeId ?? `discover-${discoverProgress.shikimoriId}`,
      animeName: discoverProgress.animeName,
      animePosterId: discoverProgress.posterCid,
      episodeId: `discover-${discoverProgress.shikimoriId}-${discoverProgress.episodeNumber}`,
      episodeNumber: discoverProgress.episodeNumber,
      episodeName: null,
      currentTime: discoverProgress.currentTime,
      durationMs: discoverProgress.duration * 1000,
      completed: discoverProgress.completed,
      lastWatchedAt: discoverProgress.lastWatchedAt,
    }
  }

  if (!libraryProgress) {
    return null
  }

  return {
    animeId: libraryProgress.animeId,
    animeName: libraryProgress.anime.name,
    animePosterId: libraryProgress.anime.posterId,
    episodeId: libraryProgress.episodeId,
    episodeNumber: libraryProgress.episode.number,
    episodeName: libraryProgress.episode.name,
    currentTime: libraryProgress.currentTime,
    durationMs: libraryProgress.episode.durationMs,
    completed: libraryProgress.completed,
    lastWatchedAt: libraryProgress.lastWatchedAt,
  }
}

/**
 * Элемент истории просмотра
 */
export interface WatchHistoryItem {
  id: string
  animeId: string
  animeName: string
  animePosterId: string | null
  episodeId: string
  episodeNumber: number
  episodeName: string | null
  currentTime: number
  durationMs: number | null
  completed: boolean
  lastWatchedAt: Date
}

/**
 * Результат запроса истории с пагинацией
 */
export interface WatchHistoryResult {
  items: WatchHistoryItem[]
  total: number
  hasMore: boolean
}

/**
 * Получить историю просмотра с пагинацией
 */
export async function findWatchHistory(options: {
  page?: number
  limit?: number
  includeCompleted?: boolean
}): Promise<WatchHistoryResult> {
  const { page = 0, limit = 20, includeCompleted = true } = options

  const where: Prisma.WatchProgressWhereInput = includeCompleted ? {} : { completed: false }

  const [items, total] = await Promise.all([
    prisma.watchProgress.findMany({
      where,
      orderBy: { lastWatchedAt: 'desc' },
      skip: page * limit,
      take: limit,
      include: {
        anime: { select: { id: true, name: true, posterId: true } },
        episode: { select: { id: true, number: true, name: true, durationMs: true } },
      },
    }),
    prisma.watchProgress.count({ where }),
  ])

  return {
    items: items.map((p) => ({
      id: p.id,
      animeId: p.animeId,
      animeName: p.anime.name,
      animePosterId: p.anime.posterId,
      episodeId: p.episodeId,
      episodeNumber: p.episode.number,
      episodeName: p.episode.name,
      currentTime: p.currentTime,
      durationMs: p.episode.durationMs,
      completed: p.completed,
      lastWatchedAt: p.lastWatchedAt,
    })),
    total,
    hasMore: (page + 1) * limit < total,
  }
}

/**
 * Обновить статус просмотра аниме
 */
export async function updateAnimeWatchStatus(
  animeId: string,
  status: WatchStatus,
  userRating?: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    await withDbRetry(() =>
      prisma.anime.update({
        where: { id: animeId },
        data: {
          watchStatus: status,
          watchedAt: status === 'COMPLETED' ? new Date() : undefined,
          userRating: userRating ?? undefined,
        },
      })
    )
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

// === РАЗДЕЛ "СМОТРЕЛ" (v0.9.8) ===

/**
 * Элемент списка просмотренных аниме
 * Агрегированные данные по аниме, а не по эпизодам
 */
export interface WatchedAnimeItem {
  animeId: string
  animeName: string
  posterPath: string | null
  watchStatus: WatchStatus
  userRating: number | null
  totalEpisodes: number
  watchedEpisodes: number // completed = true
  inProgressEpisodes: number // currentTime > 0 && !completed
  lastWatchedAt: Date
  lastEpisodeNumber: number
  overallProgress: number // 0-100%
}

/**
 * Результат запроса просмотренных аниме с пагинацией
 */
export interface WatchedAnimeResult {
  items: WatchedAnimeItem[]
  total: number
  hasMore: boolean
}

/**
 * Получить список аниме с прогрессом просмотра
 * Для таба "Смотрел" на странице истории
 */
export async function findWatchedAnime(options: { page?: number; limit?: number }): Promise<WatchedAnimeResult> {
  const { page = 0, limit = 20 } = options

  // Находим все аниме у которых есть хотя бы один WatchProgress
  const where: Prisma.AnimeWhereInput = {
    watchProgress: { some: {} },
  }

  const [animes, total] = await Promise.all([
    prisma.anime.findMany({
      where,
      include: {
        poster: { select: { cid: true } },
        watchProgress: {
          select: {
            completed: true,
            currentTime: true,
            lastWatchedAt: true,
            episode: { select: { number: true } },
          },
        },
        _count: { select: { episodes: true } },
      },
    }),
    prisma.anime.count({ where }),
  ])

  // Вычисляем агрегаты и сортируем по lastWatchedAt
  const items: WatchedAnimeItem[] = animes
    .map((anime) => {
      // Находим самый поздний прогресс
      const latestProgress = anime.watchProgress.reduce(
        (max, p) => (p.lastWatchedAt > max.lastWatchedAt ? p : max),
        anime.watchProgress[0],
      )

      const watchedEpisodes = anime.watchProgress.filter((p) => p.completed).length
      const inProgressEpisodes = anime.watchProgress.filter((p) => !p.completed && p.currentTime > 0).length
      const totalEpisodes = anime._count.episodes

      return {
        animeId: anime.id,
        animeName: anime.name,
        posterPath: toPlayableUrl({ cid: anime.poster?.cid }) ?? null,
        watchStatus: anime.watchStatus,
        userRating: anime.userRating,
        totalEpisodes,
        watchedEpisodes,
        inProgressEpisodes,
        lastWatchedAt: latestProgress.lastWatchedAt,
        lastEpisodeNumber: latestProgress.episode.number,
        overallProgress: totalEpisodes > 0 ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0,
      }
    })
    // Сортируем по времени последнего просмотра (новые первые)
    .sort((a, b) => b.lastWatchedAt.getTime() - a.lastWatchedAt.getTime())
    // Применяем пагинацию
    .slice(page * limit, (page + 1) * limit)

  return {
    items,
    total,
    hasMore: (page + 1) * limit < total,
  }
}
