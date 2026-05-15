/**
 * Хук для сохранения/восстановления прогресса просмотра
 *
 * Сохраняет позицию каждые 30 секунд в AsyncStorage.
 * Позволяет продолжить просмотр с последней позиции.
 * Опциональный onSave callback для серверной синхронизации.
 */

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCallback, useEffect, useRef, useState } from 'react'

/** Интервал автосохранения (ms) */
const SAVE_INTERVAL_MS = 30_000

/** Минимальный прогресс для сохранения (секунды) */
const MIN_PROGRESS_TO_SAVE = 30

/** Минимальное оставшееся время для показа "Продолжить" (секунды) */
const MIN_REMAINING_TIME = 60

/** Префикс ключа по умолчанию */
const DEFAULT_STORAGE_KEY_PREFIX = '@animatrona/watch_progress/'

export interface WatchProgressData {
  /** Позиция в секундах */
  position: number
  /** Длительность видео */
  duration: number
  /** Timestamp последнего сохранения */
  savedAt: number
}

export interface UseWatchProgressOptions {
  /** ID эпизода */
  episodeId: string
  /** Текущее время видео */
  currentTime: number
  /** Длительность видео */
  duration: number
  /** Видео загружено */
  isReady: boolean
  /** Пропустить диалог "продолжить просмотр" (если startTime передан извне) */
  skipResumePrompt?: boolean
  /** Префикс ключа хранилища (по умолчанию '@animatrona/watch_progress/') */
  storageKeyPrefix?: string
  /** Опциональный callback для серверной синхронизации */
  onSave?: (episodeId: string, data: { currentTime: number; completed: boolean }) => void
}

export interface UseWatchProgressResult {
  /** Сохранённая позиция (если есть) */
  savedPosition: number | null
  /** Показывать ли ResumeOverlay */
  showResumePrompt: boolean
  /** Продолжить с сохранённой позиции */
  resumeFromSaved: () => number
  /** Начать сначала (очистить прогресс) */
  startFromBeginning: () => void
  /** Закрыть overlay без действия */
  dismissPrompt: () => void
  /** Очистить сохранённый прогресс */
  clearProgress: () => Promise<void>
}

export function useWatchProgress({
  episodeId,
  currentTime,
  duration,
  isReady,
  skipResumePrompt = false,
  storageKeyPrefix = DEFAULT_STORAGE_KEY_PREFIX,
  onSave,
}: UseWatchProgressOptions): UseWatchProgressResult {
  const [savedPosition, setSavedPosition] = useState<number | null>(null)
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false)

  /** Ref для текущего времени — чтобы cleanup effect не зависел от currentTime */
  const currentTimeRef = useRef(currentTime)
  currentTimeRef.current = currentTime
  /** Ref для duration */
  const durationRef = useRef(duration)
  durationRef.current = duration

  const storageKey = `${storageKeyPrefix}${episodeId}`

  /** Загрузить сохранённый прогресс */
  const loadProgress = useCallback(async () => {
    try {
      const data = await AsyncStorage.getItem(storageKey)
      if (data) {
        const parsed: WatchProgressData = JSON.parse(data)

        // Проверяем что прогресс актуален (сохранён менее 30 дней назад)
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
        if (parsed.savedAt < thirtyDaysAgo) {
          await AsyncStorage.removeItem(storageKey)
          return null
        }

        return parsed
      }
    } catch (error) {
      console.warn('Failed to load watch progress:', error)
    }
    return null
  }, [storageKey])

  /** Сохранить прогресс (локально + опциональная серверная синхронизация) */
  const saveProgress = useCallback(async () => {
    if (currentTime < MIN_PROGRESS_TO_SAVE) {
      return
    }
    if (duration <= 0) {
      return
    }

    const isCompleted = duration - currentTime < MIN_REMAINING_TIME

    // Не сохранять локально если досмотрели до конца
    if (isCompleted) {
      await AsyncStorage.removeItem(storageKey)
    } else {
      try {
        const data: WatchProgressData = {
          position: currentTime,
          duration,
          savedAt: Date.now(),
        }
        await AsyncStorage.setItem(storageKey, JSON.stringify(data))
        // Прогресс сохранён: позиция / длительность
      } catch (error) {
        console.warn('Failed to save watch progress:', error)
      }
    }

    // Серверная синхронизация через callback
    if (onSave) {
      onSave(episodeId, { currentTime, completed: isCompleted })
    }
  }, [currentTime, duration, storageKey, episodeId, onSave])

  /** Ref для saveProgress — стабильная ссылка на актуальную функцию */
  const saveProgressRef = useRef(saveProgress)
  saveProgressRef.current = saveProgress

  /** Очистить прогресс */
  const clearProgress = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(storageKey)
      setSavedPosition(null)
    } catch (error) {
      console.warn('Failed to clear watch progress:', error)
    }
  }, [storageKey])

  /** Продолжить с сохранённой позиции */
  const resumeFromSaved = useCallback(() => {
    const position = savedPosition || 0
    setShowResumePrompt(false)
    return position
  }, [savedPosition])

  /** Начать сначала */
  const startFromBeginning = useCallback(() => {
    setShowResumePrompt(false)
    clearProgress()
  }, [clearProgress])

  /** Закрыть overlay */
  const dismissPrompt = useCallback(() => {
    setShowResumePrompt(false)
  }, [])

  // Загружаем сохранённый прогресс при монтировании
  useEffect(() => {
    if (hasCheckedStorage) {
      return
    }

    loadProgress().then((data) => {
      setHasCheckedStorage(true)

      if (data && data.position >= MIN_PROGRESS_TO_SAVE) {
        // Проверяем что не досмотрели
        const remaining = data.duration - data.position
        if (remaining >= MIN_REMAINING_TIME) {
          setSavedPosition(data.position)
          // Показываем диалог только если не skipResumePrompt
          if (!skipResumePrompt) {
            setShowResumePrompt(true)
          }
        }
      }
    })
  }, [hasCheckedStorage, loadProgress, skipResumePrompt])

  // Автосохранение прогресса по интервалу
  useEffect(() => {
    if (!isReady || showResumePrompt) {
      return
    }

    const interval = setInterval(() => {
      saveProgressRef.current()
    }, SAVE_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [isReady, showResumePrompt])

  // Сохранить при размонтировании (через refs — без лишних перезапусков)
  useEffect(() => {
    return () => {
      if (currentTimeRef.current >= MIN_PROGRESS_TO_SAVE && durationRef.current > 0) {
        saveProgressRef.current()
      }
    }
  }, [])

  return {
    savedPosition,
    showResumePrompt,
    resumeFromSaved,
    startFromBeginning,
    dismissPrompt,
    clearProgress,
  }
}

import { formatDuration } from '../utils/format'

/**
 * Форматирование времени для отображения
 * @deprecated Используй `formatDuration` из `@letar/animatrona-shared`
 */
export const formatTimeForDisplay = formatDuration

/**
 * Получить сохранённый прогресс для эпизода из AsyncStorage
 *
 * @param episodeId — ID эпизода
 * @param storageKeyPrefix — префикс ключа (по умолчанию '@animatrona/watch_progress/')
 */
export async function getStoredProgress(
  episodeId: string,
  storageKeyPrefix: string = DEFAULT_STORAGE_KEY_PREFIX
): Promise<WatchProgressData | null> {
  try {
    const storageKey = `${storageKeyPrefix}${episodeId}`
    const data = await AsyncStorage.getItem(storageKey)
    if (data) {
      const parsed: WatchProgressData = JSON.parse(data)

      // Проверяем актуальность (менее 30 дней)
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      if (parsed.savedAt < thirtyDaysAgo) {
        await AsyncStorage.removeItem(storageKey)
        return null
      }

      // Проверяем минимальный прогресс
      if (parsed.position < MIN_PROGRESS_TO_SAVE) {
        return null
      }

      // Проверяем что не досмотрели
      const remaining = parsed.duration - parsed.position
      if (remaining < MIN_REMAINING_TIME) {
        return null
      }

      return parsed
    }
  } catch (error) {
    console.warn('Failed to get stored progress:', error)
  }
  return null
}
