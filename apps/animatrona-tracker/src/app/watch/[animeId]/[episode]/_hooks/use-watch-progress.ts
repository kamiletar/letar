/**
 * Хук сохранения прогресса просмотра
 *
 * Управляет: периодическое сохранение (каждые 5 сек),
 * отметка completed при завершении, автопереход на следующий эпизод.
 */

import type { EpisodeManifest } from '@letar/animatrona-types'
import { type RefObject, useEffect, useRef } from 'react'

interface UseWatchProgressOptions {
  /** Ref на video элемент */
  videoRef: RefObject<HTMLVideoElement | null>
  /** ID аниме */
  animeId: string
  /** Slug аниме (для навигации) */
  animeSlug: string
  /** Номер эпизода */
  episodeNum: number
  /** Длительность */
  duration: number
  /** Индекс аудиодорожки */
  audioTrackIndex: number
  /** Индекс субтитров */
  subtitleTrackIndex: number
  /** Навигация из манифеста */
  navigation?: EpisodeManifest['navigation']
}

export function useWatchProgress({
  videoRef,
  animeId,
  animeSlug,
  episodeNum,
  duration,
  audioTrackIndex,
  subtitleTrackIndex,
  navigation,
}: UseWatchProgressOptions): void {
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Сохранение прогресса каждые 5 секунд
  useEffect(() => {
    progressTimerRef.current = setInterval(() => {
      const video = videoRef.current
      if (video && !video.paused) {
        fetch('/api/watch-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            animeId,
            episodeNumber: episodeNum,
            currentTime: video.currentTime,
            duration: duration || video.duration || 0,
            audioTrackIndex,
            subtitleTrackIndex,
          }),
        }).catch(() => {
          /* тихо при ошибке */
        })
      }
    }, 5000)
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
      }
    }
  }, [animeId, episodeNum, duration, audioTrackIndex, subtitleTrackIndex])

  // Автопереход к следующему эпизоду
  useEffect(() => {
    const video = videoRef.current
    if (!video) {
      return
    }
    const handleEnded = () => {
      // Сохраняем как completed
      fetch('/api/watch-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animeId,
          episodeNumber: episodeNum,
          currentTime: duration,
          duration,
          audioTrackIndex,
          subtitleTrackIndex,
          completed: true,
        }),
      }).catch(() => {
        /* игнорируем */
      })

      if (navigation?.nextEpisode) {
        window.location.href = `/watch/${animeSlug}/${episodeNum + 1}`
      }
    }
    video.addEventListener('ended', handleEnded)
    return () => video.removeEventListener('ended', handleEnded)
  }, [animeId, animeSlug, episodeNum, duration, audioTrackIndex, subtitleTrackIndex, navigation])
}
