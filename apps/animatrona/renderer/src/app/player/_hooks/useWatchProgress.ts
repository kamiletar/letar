/**
 * Хук для сохранения позиции просмотра в localStorage
 * Используется в папочном режиме плеера (без БД)
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import type { WatchProgressEntry, WatchProgressStorage } from '../types'

/** Ключ для localStorage */
const STORAGE_KEY = 'animatrona-folder-player-progress'

/** Интервал автосохранения (мс) */
const SAVE_INTERVAL = 5000

/** Максимальный возраст записи (30 дней в мс) */
const MAX_AGE = 30 * 24 * 60 * 60 * 1000

/** Минимальный процент для показа "продолжить с места" */
const MIN_PROGRESS_PERCENT = 2

/** Максимальный процент для показа "продолжить с места" (если почти досмотрел — начать сначала) */
const MAX_PROGRESS_PERCENT = 95

/**
 * Хук для управления прогрессом просмотра
 */
export function useWatchProgress() {
  const [storage, setStorage] = useState<WatchProgressStorage>({})
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingUpdatesRef = useRef<Map<string, WatchProgressEntry>>(new Map())

  /**
   * Загрузка данных из localStorage при монтировании
   */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as WatchProgressStorage
        // Очистка старых записей
        const now = Date.now()
        const cleaned: WatchProgressStorage = {}
        for (const [path, entry] of Object.entries(parsed)) {
          if (now - entry.updatedAt < MAX_AGE) {
            cleaned[path] = entry
          }
        }
        setStorage(cleaned)
        // Сохраняем очищенные данные обратно
        if (Object.keys(cleaned).length !== Object.keys(parsed).length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
        }
      }
    } catch (error) {
      console.error('[useWatchProgress] Ошибка загрузки из localStorage:', error)
    }
  }, [])

  /**
   * Сохранение в localStorage (debounced)
   */
  const flushToStorage = useCallback(() => {
    if (pendingUpdatesRef.current.size === 0) {
      return
    }

    setStorage((prev) => {
      const updated = { ...prev }
      for (const [path, entry] of pendingUpdatesRef.current) {
        updated[path] = entry
      }
      pendingUpdatesRef.current.clear()

      // Сохраняем в localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch (error) {
        console.error('[useWatchProgress] Ошибка сохранения в localStorage:', error)
      }

      return updated
    })
  }, [])

  /**
   * Очистка при размонтировании
   */
  useEffect(() => {
    return () => {
      // Сохраняем все pending обновления
      if (pendingUpdatesRef.current.size > 0) {
        flushToStorage()
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [flushToStorage])

  /**
   * Получить прогресс для файла
   */
  const getProgress = useCallback(
    (filePath: string): WatchProgressEntry | null => {
      return storage[filePath] ?? pendingUpdatesRef.current.get(filePath) ?? null
    },
    [storage]
  )

  /**
   * Сохранить прогресс (debounced)
   */
  const saveProgress = useCallback(
    (filePath: string, time: number, duration: number) => {
      // Добавляем в pending обновления
      pendingUpdatesRef.current.set(filePath, {
        time,
        duration,
        updatedAt: Date.now(),
      })

      // Сбрасываем предыдущий таймер
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      // Устанавливаем новый таймер
      saveTimeoutRef.current = setTimeout(flushToStorage, SAVE_INTERVAL)
    },
    [flushToStorage]
  )

  /**
   * Принудительное сохранение (при смене эпизода)
   */
  const saveProgressNow = useCallback(
    (filePath: string, time: number, duration: number) => {
      pendingUpdatesRef.current.set(filePath, {
        time,
        duration,
        updatedAt: Date.now(),
      })
      flushToStorage()
    },
    [flushToStorage]
  )

  /**
   * Удалить прогресс для файла
   */
  const clearProgress = useCallback((filePath: string) => {
    pendingUpdatesRef.current.delete(filePath)
    setStorage((prev) => {
      const { [filePath]: _removed, ...rest } = prev
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
      } catch (error) {
        console.error('[useWatchProgress] Ошибка удаления из localStorage:', error)
      }
      return rest
    })
  }, [])

  /**
   * Проверить, нужно ли показывать "продолжить с места"
   */
  const shouldShowResume = useCallback(
    (filePath: string): boolean => {
      const entry = getProgress(filePath)
      if (!entry || entry.duration === 0) {
        return false
      }

      const percent = (entry.time / entry.duration) * 100
      return percent >= MIN_PROGRESS_PERCENT && percent <= MAX_PROGRESS_PERCENT
    },
    [getProgress]
  )

  /**
   * Получить время для возобновления (или 0 если нет прогресса)
   */
  const getResumeTime = useCallback(
    (filePath: string): number => {
      const entry = getProgress(filePath)
      if (!entry || entry.duration === 0) {
        return 0
      }

      const percent = (entry.time / entry.duration) * 100
      // Если почти досмотрел — начать сначала
      if (percent > MAX_PROGRESS_PERCENT) {
        return 0
      }

      return entry.time
    },
    [getProgress]
  )

  /**
   * Получить процент просмотра (0-100)
   */
  const getProgressPercent = useCallback(
    (filePath: string): number => {
      const entry = getProgress(filePath)
      if (!entry || entry.duration === 0) {
        return 0
      }
      return Math.min(100, Math.round((entry.time / entry.duration) * 100))
    },
    [getProgress]
  )

  /**
   * Получить все записи прогресса
   */
  const getAllProgress = useCallback((): WatchProgressStorage => {
    return { ...storage }
  }, [storage])

  return {
    /** Получить прогресс для файла */
    getProgress,
    /** Сохранить прогресс (debounced, каждые 5 сек) */
    saveProgress,
    /** Принудительное сохранение (при смене эпизода) */
    saveProgressNow,
    /** Удалить прогресс для файла */
    clearProgress,
    /** Нужно ли показывать "продолжить с места" */
    shouldShowResume,
    /** Получить время для возобновления */
    getResumeTime,
    /** Получить процент просмотра (0-100) */
    getProgressPercent,
    /** Получить все записи */
    getAllProgress,
  }
}
