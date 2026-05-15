'use client'

/**
 * Хук для управления оверлеем "Следующий эпизод"
 *
 * Отслеживает время до конца видео и показывает оверлей
 * за указанное количество секунд (по умолчанию 30)
 *
 * Логика:
 * - Если есть следующий эпизод → показывает карточку эпизода
 * - Если последний эпизод + есть сиквел в библиотеке → показывает карточку сиквела
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { UpNextContent, VideoPlayerRef } from '@/components/player'
import { useFindUniqueSettings } from '@/lib/hooks'
import { getSequelSuggestion, type SequelSuggestion } from '@/lib/watch-next'
import { useRouter } from 'next/navigation'

import { toPlayableUrl } from '@/lib/media-url'

import type { EpisodeNavInfo, EpisodeWithTracks } from './types'
import type { UseEpisodeNavigationReturn } from './use-episode-navigation'

/**
 * Извлекает первый thumbnail из JSON строки thumbnailCids и возвращает URL через gateway
 */
function getFirstThumbnailUrl(episode: EpisodeNavInfo | null): string | undefined {
  if (!episode?.thumbnailCids) {
    return undefined
  }
  try {
    const cids = JSON.parse(episode.thumbnailCids) as string[]
    const firstCid = cids[0]
    if (!firstCid) {
      return undefined
    }
    return toPlayableUrl({ cid: firstCid }) ?? undefined
  } catch {
    return undefined
  }
}

/** Секунд до конца, когда показывать оверлей */
const SHOW_BEFORE_END_SECONDS = 30

// Re-export тип из компонента
export type { UpNextContent } from '@/components/player'

interface UseUpNextOptions {
  /** Ref на плеер (для будущего использования) */
  playerRef: React.RefObject<VideoPlayerRef | null>
  /** Данные текущего эпизода */
  episode: EpisodeWithTracks | null | undefined
  /** Данные навигации между эпизодами */
  navigation: UseEpisodeNavigationReturn
  /** Текущее время видео (обновляется из handleTimeUpdate) */
  currentTime: number
  /** Длительность видео */
  duration: number
}

/**
 * Хук для управления UpNextOverlay
 */
export function useUpNext(options: UseUpNextOptions) {
  const { episode, navigation, currentTime, duration } = options
  const router = useRouter()

  const [isVisible, setIsVisible] = useState(false)
  const [wasDismissed, setWasDismissed] = useState(false)
  const episodeIdRef = useRef<string | null>(null)

  // Состояние для сиквела (загружается при последнем эпизоде)
  const [sequelSuggestion, setSequelSuggestion] = useState<SequelSuggestion | null>(null)
  // Зарезервирован для показа loading state в overlay
  const [, setIsLoadingSequel] = useState(false)

  // Загружаем настройки для autoplay
  const { data: settings } = useFindUniqueSettings({ where: { id: 'default' } })
  const autoPlayEnabled = settings?.autoplay ?? true

  // Сбрасываем состояние при смене эпизода
  useEffect(() => {
    if (episode?.id !== episodeIdRef.current) {
      episodeIdRef.current = episode?.id ?? null
      setIsVisible(false)
      setWasDismissed(false)
      setSequelSuggestion(null) // Сбрасываем сиквел при смене эпизода
    }
  }, [episode?.id])

  // Загружаем сиквел когда это последний эпизод
  useEffect(() => {
    // Не загружаем если есть следующий эпизод или нет animeId
    if (!navigation.isLastEpisode || !episode?.animeId) {
      setSequelSuggestion(null)
      return
    }

    const loadSequel = async () => {
      setIsLoadingSequel(true)
      try {
        const result = await getSequelSuggestion(episode.animeId!)
        setSequelSuggestion(result)
      } catch {
        // Ошибка загрузки — просто не показываем сиквел
        setSequelSuggestion(null)
      } finally {
        setIsLoadingSequel(false)
      }
    }

    loadSequel()
  }, [navigation.isLastEpisode, episode?.animeId])

  // Определяем следующий контент: эпизод → сиквел → null
  const nextContent = useMemo<UpNextContent | null>(() => {
    // Приоритет 1: Следующий эпизод в этом аниме
    if (navigation.nextEpisode) {
      return {
        type: 'episode',
        title: navigation.nextEpisode.name || `Эпизод ${navigation.nextEpisode.number}`,
        subtitle: `${navigation.nextEpisode.number}`,
        episodeId: navigation.nextEpisode.id,
        posterPath: getFirstThumbnailUrl(navigation.nextEpisode),
      }
    }

    // Приоритет 2: Сиквел (только если он в библиотеке и есть эпизоды)
    if (sequelSuggestion?.isInLibrary && sequelSuggestion.firstEpisodeId && sequelSuggestion.animeId) {
      return {
        type: 'anime',
        title: sequelSuggestion.name,
        subtitle: sequelSuggestion.relationLabel, // "Продолжение", "Спин-офф"
        posterPath: sequelSuggestion.posterPath,
        animeId: sequelSuggestion.animeId,
        episodeId: sequelSuggestion.firstEpisodeId,
      }
    }

    // Нет следующего контента (CompletionOverlay предложит добавить сиквел)
    return null
  }, [navigation.nextEpisode, sequelSuggestion])

  // Проверяем, нужно ли показать оверлей
  useEffect(() => {
    // Не показываем если:
    // - Нет следующего контента
    // - Оверлей уже был закрыт пользователем
    // - autoplay выключен
    // - Видео ещё не загружено (duration = 0)
    if (!nextContent || wasDismissed || !autoPlayEnabled || duration === 0) {
      return
    }

    const remainingSeconds = duration - currentTime

    // Показываем за 30 секунд до конца
    if (remainingSeconds <= SHOW_BEFORE_END_SECONDS && remainingSeconds > 0 && !isVisible) {
      setIsVisible(true)
    }

    // Скрываем если перемотали назад больше чем на 30 секунд
    if (remainingSeconds > SHOW_BEFORE_END_SECONDS + 5 && isVisible) {
      setIsVisible(false)
    }
  }, [currentTime, duration, nextContent, wasDismissed, autoPlayEnabled, isVisible])

  // Обработчик нажатия "Смотреть сейчас"
  const handlePlayNow = useCallback(() => {
    setIsVisible(false)

    if (nextContent?.type === 'episode' && nextContent.episodeId) {
      // Следующий эпизод в том же аниме
      navigation.goToNextEpisode()
    } else if (nextContent?.type === 'anime' && nextContent.episodeId) {
      // Переход к первому эпизоду сиквела
      router.push(`/watch/${nextContent.episodeId}`)
    }
  }, [nextContent, navigation])

  // Обработчик отмены (закрытие оверлея)
  const handleCancel = useCallback(() => {
    setIsVisible(false)
    setWasDismissed(true)
  }, [])

  return {
    /** Следующий контент для оверлея */
    nextContent,
    /** Показывать ли оверлей */
    isVisible,
    /** Включено ли автовоспроизведение */
    autoPlayEnabled,
    /** Callback для кнопки "Смотреть" */
    handlePlayNow,
    /** Callback для кнопки "Отмена" */
    handleCancel,
  }
}

export type UseUpNextReturn = ReturnType<typeof useUpNext>
