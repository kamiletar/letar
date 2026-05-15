'use client'

/**
 * Хук для навигации между эпизодами
 */

import { useCallback, useMemo } from 'react'

import { updateAnimeWatchStatus } from '@/app/_actions/watch-progress.action'
import type { VideoPlayerRef } from '@/components/player'
import { useFindManyEpisode } from '@/lib/hooks'

import { useRouter } from 'next/navigation'

import type { EpisodeNavInfo, EpisodeWithTracks } from './types'

interface UseEpisodeNavigationOptions {
  /** Ref на плеер */
  playerRef: React.RefObject<VideoPlayerRef | null>
  /** Данные эпизода */
  episode: EpisodeWithTracks | null | undefined
  /** Функция сохранения прогресса */
  saveProgress: (currentTime: number, completed?: boolean) => void
  /** Callback для показа экрана завершения (вместо автоперехода) */
  onShowCompletion?: () => void
}

/**
 * Хук для навигации между эпизодами
 */
export function useEpisodeNavigation(options: UseEpisodeNavigationOptions) {
  const { playerRef, episode, saveProgress, onShowCompletion } = options
  const router = useRouter()

  // Загружаем все эпизоды аниме для навигации
  const { data: allEpisodes } = useFindManyEpisode(
    episode?.animeId
      ? {
          where: { animeId: episode.animeId },
          orderBy: { number: 'asc' },
          select: { id: true, number: true, name: true, thumbnailCids: true },
        }
      : undefined
  )

  // Находим предыдущий и следующий эпизоды
  const { prevEpisode, nextEpisode } = useMemo(() => {
    if (!allEpisodes || !episode) {
      return { prevEpisode: null, nextEpisode: null }
    }
    const currentIndex = allEpisodes.findIndex((ep) => ep.id === episode.id)
    return {
      prevEpisode: currentIndex > 0 ? (allEpisodes[currentIndex - 1] as EpisodeNavInfo) : null,
      nextEpisode: currentIndex < allEpisodes.length - 1 ? (allEpisodes[currentIndex + 1] as EpisodeNavInfo) : null,
    }
  }, [allEpisodes, episode])

  // Навигация к предыдущему эпизоду
  const goToPrevEpisode = useCallback(() => {
    if (prevEpisode) {
      router.push(`/watch/${prevEpisode.id}`)
    }
  }, [prevEpisode])

  // Навигация к следующему эпизоду
  const goToNextEpisode = useCallback(() => {
    if (nextEpisode) {
      router.push(`/watch/${nextEpisode.id}`)
    }
  }, [nextEpisode])

  // Обработчик окончания видео
  const handleEnded = useCallback(() => {
    if (playerRef.current) {
      saveProgress(playerRef.current.getDuration(), true)
    }

    // Автопереход на следующий эпизод
    if (nextEpisode) {
      router.push(`/watch/${nextEpisode.id}`)
    } else if (episode?.animeId) {
      // Это последний эпизод — устанавливаем статус COMPLETED
      updateAnimeWatchStatus(episode.animeId, 'COMPLETED').catch((err) =>
        console.error('[WatchPage] Ошибка установки статуса COMPLETED:', err)
      )

      // Показываем экран завершения с рекомендацией сиквела
      if (onShowCompletion) {
        onShowCompletion()
      }
    }
  }, [saveProgress, nextEpisode, episode, playerRef, onShowCompletion])

  // Tooltip для предыдущего эпизода
  const prevEpisodeTooltip = useMemo(() => {
    return prevEpisode
      ? `Эпизод ${prevEpisode.number}${prevEpisode.name ? `: ${prevEpisode.name}` : ''}`
      : 'Это первый эпизод'
  }, [prevEpisode])

  // Tooltip для следующего эпизода
  const nextEpisodeTooltip = useMemo(() => {
    return nextEpisode
      ? `Эпизод ${nextEpisode.number}${nextEpisode.name ? `: ${nextEpisode.name}` : ''}`
      : 'Это последний эпизод'
  }, [nextEpisode])

  return {
    // Данные
    allEpisodes: allEpisodes as EpisodeNavInfo[] | undefined,
    prevEpisode,
    nextEpisode,
    hasPrevEpisode: !!prevEpisode,
    hasNextEpisode: !!nextEpisode,
    isLastEpisode: !nextEpisode && !!episode,
    prevEpisodeTooltip,
    nextEpisodeTooltip,

    // Обработчики
    goToPrevEpisode,
    goToNextEpisode,
    handleEnded,
  }
}

export type UseEpisodeNavigationReturn = ReturnType<typeof useEpisodeNavigation>
