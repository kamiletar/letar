'use client'

/**
 * Хук для сохранения прогресса просмотра из MiniPlayer
 *
 * Периодически (каждые 5 сек) сохраняет currentTime в БД,
 * пока видео воспроизводится в mini mode.
 * При закрытии MiniPlayer сохраняет финальную позицию.
 */

import { useCallback, useEffect, useRef } from 'react'

import { useGlobalVideoStore } from '@/components/global-video'
import { useUpsertWatchProgress } from '@/lib/hooks'

/** Интервал сохранения прогресса (мс) */
const SAVE_INTERVAL = 5000

/** Порог автоотметки: если до конца ≤ 120 сек — серия просмотрена */
const COMPLETED_THRESHOLD = 120

/**
 * Сохраняет прогресс просмотра при воспроизведении в mini mode
 */
export function useMiniPlayerProgress() {
  const mode = useGlobalVideoStore((s) => s.mode)
  const metadata = useGlobalVideoStore((s) => s.metadata)
  const isPlaying = useGlobalVideoStore((s) => s.isPlaying)

  const { mutate: upsertProgress } = useUpsertWatchProgress()

  const lastSaveTimestampRef = useRef(0)
  const completedMarkedRef = useRef(false)

  // Сброс флага completed при смене эпизода
  useEffect(() => {
    completedMarkedRef.current = false
  }, [metadata?.episodeId])

  const saveProgress = useCallback(
    (currentTime: number, completed = false) => {
      if (!metadata) return

      upsertProgress({
        where: {
          animeId_episodeId: {
            animeId: metadata.animeId,
            episodeId: metadata.episodeId,
          },
        },
        create: {
          animeId: metadata.animeId,
          episodeId: metadata.episodeId,
          currentTime,
          completed,
          lastWatchedAt: new Date(),
        },
        update: {
          currentTime,
          completed,
          lastWatchedAt: new Date(),
        },
      })
    },
    [metadata, upsertProgress]
  )

  // Периодическое сохранение при воспроизведении в mini mode
  useEffect(() => {
    if (mode !== 'mini' || !isPlaying || !metadata) return

    const interval = setInterval(() => {
      const { currentTime, duration } = useGlobalVideoStore.getState()
      if (currentTime <= 0) return

      // Автоотметка: если до конца ≤ 120 сек
      if (duration > 0 && duration - currentTime <= COMPLETED_THRESHOLD && !completedMarkedRef.current) {
        completedMarkedRef.current = true
        saveProgress(currentTime, true)
        return
      }

      const now = Date.now()
      if (now - lastSaveTimestampRef.current >= SAVE_INTERVAL) {
        lastSaveTimestampRef.current = now
        saveProgress(currentTime)
      }
    }, SAVE_INTERVAL)

    return () => clearInterval(interval)
  }, [mode, isPlaying, metadata, saveProgress])

  // Сохранение при закрытии MiniPlayer (переход из mini в hidden)
  useEffect(() => {
    if (mode !== 'mini') return

    return () => {
      const { currentTime } = useGlobalVideoStore.getState()
      if (currentTime > 0 && metadata) {
        saveProgress(currentTime)
      }
    }
  }, [mode, metadata, saveProgress])
}
