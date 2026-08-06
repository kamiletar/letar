'use server'

/**
 * Server Actions для прогресса просмотра из каталога (DiscoverWatchProgress)
 * Без FK на Anime/Episode — ключ shikimoriId + episodeNumber
 */

import type { DiscoverWatchProgress } from '@/generated/prisma'
import { prisma } from '@/lib/db'
import { withDbRetry } from '@/lib/db-retry'

// === UPSERT ===

/**
 * Создать или обновить прогресс просмотра из каталога
 */
export async function upsertDiscoverWatchProgress(
  shikimoriId: number,
  episodeNumber: number,
  data: {
    currentTime: number
    duration: number
    completed?: boolean
    selectedAudioTrackId?: string | null
    selectedSubtitleTrackId?: string | null
    animeName?: string
    posterCid?: string | null
    trackerAnimeId?: string | null
    directoryCid?: string | null
  },
): Promise<DiscoverWatchProgress> {
  return withDbRetry(() =>
    prisma.discoverWatchProgress.upsert({
      where: {
        shikimoriId_episodeNumber: { shikimoriId, episodeNumber },
      },
      create: {
        shikimoriId,
        episodeNumber,
        currentTime: data.currentTime,
        duration: data.duration,
        completed: data.completed ?? false,
        selectedAudioTrackId: data.selectedAudioTrackId ?? null,
        selectedSubtitleTrackId: data.selectedSubtitleTrackId ?? null,
        animeName: data.animeName ?? '',
        posterCid: data.posterCid ?? null,
        trackerAnimeId: data.trackerAnimeId ?? null,
        directoryCid: data.directoryCid ?? null,
        lastWatchedAt: new Date(),
      },
      update: {
        currentTime: data.currentTime,
        duration: data.duration,
        completed: data.completed,
        selectedAudioTrackId: data.selectedAudioTrackId,
        selectedSubtitleTrackId: data.selectedSubtitleTrackId,
        // Обновляем метаданные если переданы
        ...(data.animeName != null ? { animeName: data.animeName } : {}),
        ...(data.posterCid !== undefined ? { posterCid: data.posterCid } : {}),
        ...(data.trackerAnimeId !== undefined ? { trackerAnimeId: data.trackerAnimeId } : {}),
        ...(data.directoryCid !== undefined ? { directoryCid: data.directoryCid } : {}),
        lastWatchedAt: new Date(),
      },
    })
  )
}

// === READ ===

/**
 * Получить прогресс для конкретного эпизода
 */
export async function findDiscoverWatchProgress(
  shikimoriId: number,
  episodeNumber: number,
): Promise<DiscoverWatchProgress | null> {
  return prisma.discoverWatchProgress.findUnique({
    where: {
      shikimoriId_episodeNumber: { shikimoriId, episodeNumber },
    },
  })
}

/**
 * Данные для карточки "Продолжить смотреть" из каталога
 */
export interface DiscoverLastWatchedData {
  shikimoriId: number
  episodeNumber: number
  animeName: string
  posterCid: string | null
  trackerAnimeId: string | null
  directoryCid: string | null
  currentTime: number
  duration: number
  completed: boolean
  lastWatchedAt: Date
}

/**
 * Получить последний просмотренный эпизод из каталога
 * Для sidebar "Продолжить смотреть"
 */
export async function findLastDiscoverWatched(): Promise<DiscoverLastWatchedData | null> {
  const progress = await prisma.discoverWatchProgress.findFirst({
    where: {
      completed: false,
      currentTime: { gt: 10 },
    },
    orderBy: { lastWatchedAt: 'desc' },
  })

  if (!progress) {
    return null
  }

  return {
    shikimoriId: progress.shikimoriId,
    episodeNumber: progress.episodeNumber,
    animeName: progress.animeName,
    posterCid: progress.posterCid,
    trackerAnimeId: progress.trackerAnimeId,
    directoryCid: progress.directoryCid,
    currentTime: progress.currentTime,
    duration: progress.duration,
    completed: progress.completed,
    lastWatchedAt: progress.lastWatchedAt,
  }
}
