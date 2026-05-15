'use client'

/**
 * Хук для сохранения/восстановления прогресса просмотра в БД
 *
 * Используется в discover/watch — прогресс хранится в DiscoverWatchProgress (SQLite).
 * Ключ: shikimoriId + episodeNumber.
 * При монтировании мигрирует старые данные из localStorage в БД (однократно).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { findDiscoverWatchProgress, upsertDiscoverWatchProgress } from '@/app/_actions/discover-watch-progress.action'

/** Минимальное время для показа ResumeOverlay (секунды) */
const MIN_RESUME_TIME = 10

/** Порог "досмотрено" — осталось меньше 2 минут */
const COMPLETED_THRESHOLD = 120

/** Интервал throttle сохранения (мс) */
const SAVE_THROTTLE_MS = 5000

/** Префикс для ключей localStorage (для миграции) */
const KEY_PREFIX = 'discover-progress:'

/** Метаданные аниме для сохранения в БД */
interface DiscoverProgressMeta {
  animeName?: string
  posterCid?: string | null
  trackerAnimeId?: string | null
  directoryCid?: string | null
}

interface UseDiscoverProgressOptions {
  /** shikimoriId аниме (стабильный ключ) */
  shikimoriId?: string | number | null
  /** Номер эпизода */
  episodeNumber: number | null
  /** Метаданные для сохранения в БД */
  meta?: DiscoverProgressMeta
}

interface UseDiscoverProgressResult {
  /** Показывать ли ResumeOverlay */
  showResumeOverlay: boolean
  /** Продолжить с сохранённой позиции */
  handleResume: () => void
  /** Начать сначала */
  handleStartOver: () => void
  /** Сохранить прогресс (throttled) */
  saveProgress: (time: number, duration: number, audioTrackId?: string | null, subtitleTrackId?: string | null) => void
  /** Начальный audioTrackId из сохранённого прогресса */
  initialAudioTrackId: string | null
  /** Начальный subtitleTrackId из сохранённого прогресса */
  initialSubtitleTrackId: string | null
  /** Время для ResumeOverlay */
  savedResumeTime: number
}

/** Миграция данных из localStorage в БД (однократно) */
async function migrateFromLocalStorage(shikimoriId: number, episodeNumber: number): Promise<void> {
  try {
    const key = `${KEY_PREFIX}${shikimoriId}:${episodeNumber}`
    const raw = localStorage.getItem(key)
    if (!raw) {
      return
    }
    const entry = JSON.parse(raw) as {
      currentTime: number
      duration: number
      audioTrackId: string | null
      subtitleTrackId: string | null
    }
    // Сохраняем в БД
    await upsertDiscoverWatchProgress(shikimoriId, episodeNumber, {
      currentTime: entry.currentTime,
      duration: entry.duration,
      selectedAudioTrackId: entry.audioTrackId,
      selectedSubtitleTrackId: entry.subtitleTrackId,
    })
    // Удаляем из localStorage
    localStorage.removeItem(key)
  } catch {
    // Ошибки миграции не критичны
  }
}

/**
 * Хук для DB-прогресса в discover плеере
 */
export function useDiscoverProgress({
  shikimoriId,
  episodeNumber,
  meta,
}: UseDiscoverProgressOptions): UseDiscoverProgressResult {
  const numericShikimoriId = shikimoriId ? Number(shikimoriId) : null
  const epNum = episodeNumber

  // Загружаем сохранённый прогресс при монтировании
  const [savedAudioTrackId, setSavedAudioTrackId] = useState<string | null>(null)
  const [savedSubtitleTrackId, setSavedSubtitleTrackId] = useState<string | null>(null)
  const [showResumeOverlay, setShowResumeOverlay] = useState(false)
  const resumeTimeRef = useRef(0)
  const lastSaveRef = useRef(0)
  const metaRef = useRef(meta)
  metaRef.current = meta

  // Загрузка прогресса из БД
  useEffect(() => {
    if (numericShikimoriId == null || epNum == null) {
      setShowResumeOverlay(false)
      return
    }

    const load = async () => {
      // Сначала мигрируем из localStorage (если есть)
      await migrateFromLocalStorage(numericShikimoriId, epNum)

      const entry = await findDiscoverWatchProgress(numericShikimoriId, epNum)

      if (entry) {
        setSavedAudioTrackId(entry.selectedAudioTrackId)
        setSavedSubtitleTrackId(entry.selectedSubtitleTrackId)

        if (entry.currentTime > MIN_RESUME_TIME) {
          const remaining = entry.duration - entry.currentTime
          if (remaining > COMPLETED_THRESHOLD) {
            setShowResumeOverlay(true)
            resumeTimeRef.current = entry.currentTime
          }
        }
      }
    }

    load()
  }, [numericShikimoriId, epNum])

  const handleResume = useCallback(() => {
    setShowResumeOverlay(false)
  }, [])

  const handleStartOver = useCallback(() => {
    setShowResumeOverlay(false)
    resumeTimeRef.current = 0
  }, [])

  // Throttled сохранение прогресса в БД
  const saveProgress = useCallback(
    (time: number, duration: number, audioTrackId?: string | null, subtitleTrackId?: string | null) => {
      if (numericShikimoriId == null || epNum == null || duration <= 0) {
        return
      }

      // Защита от Infinity/NaN — Prisma не принимает нефинитные числа
      if (!Number.isFinite(time) || !Number.isFinite(duration)) {
        return
      }

      const now = Date.now()
      if (now - lastSaveRef.current < SAVE_THROTTLE_MS) {
        return
      }
      lastSaveRef.current = now

      const m = metaRef.current
      const isCompleted = duration - time < COMPLETED_THRESHOLD && time > MIN_RESUME_TIME
      upsertDiscoverWatchProgress(numericShikimoriId, epNum, {
        currentTime: time,
        duration,
        completed: isCompleted,
        selectedAudioTrackId: audioTrackId ?? null,
        selectedSubtitleTrackId: subtitleTrackId ?? null,
        animeName: m?.animeName,
        posterCid: m?.posterCid,
        trackerAnimeId: m?.trackerAnimeId,
        directoryCid: m?.directoryCid,
      }).catch(() => {
        // Ошибки сохранения не критичны
      })

      // Параллельно отправляем прогресс на трекер (fire-and-forget)
      if (m?.trackerAnimeId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tracker preload API
        const tracker = (window.electronAPI as any)?.tracker
        if (tracker?.pushWatchProgress) {
          tracker
            .pushWatchProgress({
              trackerAnimeId: m.trackerAnimeId,
              episodeNumber: epNum,
              currentTime: time,
              duration,
              completed: isCompleted,
            })
            .catch(() => {
              // Ошибки отправки не критичны — sync service обработает позже
            })
        }
      }
    },
    [numericShikimoriId, epNum]
  )

  const initialAudioTrackId = useMemo(() => savedAudioTrackId, [savedAudioTrackId])
  const initialSubtitleTrackId = useMemo(() => savedSubtitleTrackId, [savedSubtitleTrackId])

  const savedResumeTime = resumeTimeRef.current

  return {
    showResumeOverlay,
    handleResume,
    handleStartOver,
    saveProgress,
    initialAudioTrackId,
    initialSubtitleTrackId,
    savedResumeTime,
  }
}
