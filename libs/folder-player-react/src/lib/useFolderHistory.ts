/**
 * Хук для хранения истории открытых папок в персистентном хранилище
 * Используется в папочном режиме плеера
 */

import { useCallback, useEffect, useState } from 'react'

import type { FolderPlayerStorage } from './host'
import type { FolderHistoryEntry, FolderHistoryStorage } from './types'

/** Ключ хранилища */
const STORAGE_KEY = 'animatrona-folder-history'

/** Максимальное количество папок в истории */
const MAX_FOLDERS = 10

/** Максимальный возраст записи (90 дней в мс) */
const MAX_AGE = 90 * 24 * 60 * 60 * 1000

/**
 * Хук для управления историей папок
 */
export function useFolderHistory(storage: FolderPlayerStorage) {
  const [history, setHistory] = useState<FolderHistoryStorage>([])

  /**
   * Загрузка данных из хранилища при монтировании
   */
  useEffect(() => {
    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as FolderHistoryStorage
        // Очистка старых записей
        const now = Date.now()
        const cleaned = parsed.filter((entry) => now - entry.lastOpenedAt < MAX_AGE)
        // oxlint-disable-next-line react/set-state-in-effect -- гидратация из хранилища (внешняя система)
        setHistory(cleaned)
        // Сохраняем очищенные данные обратно
        if (cleaned.length !== parsed.length) {
          storage.setItem(STORAGE_KEY, JSON.stringify(cleaned))
        }
      }
    } catch (error) {
      console.error('[useFolderHistory] Ошибка загрузки из хранилища:', error)
    }
    // Загрузка только при монтировании — storage считается стабильным на весь жизненный цикл хоста
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Сохранить историю в хранилище
   */
  const saveToStorage = useCallback(
    (data: FolderHistoryStorage) => {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch (error) {
        console.error('[useFolderHistory] Ошибка сохранения в хранилище:', error)
      }
    },
    [storage],
  )

  /**
   * Добавить папку в историю (или обновить существующую)
   */
  const addFolder = useCallback(
    (folderPath: string, folderName: string, episodeCount: number) => {
      setHistory((prev) => {
        // Удаляем существующую запись для этой папки
        const filtered = prev.filter((entry) => entry.folderPath !== folderPath)

        // Создаём новую запись
        const newEntry: FolderHistoryEntry = {
          folderPath,
          folderName,
          episodeCount,
          lastOpenedAt: Date.now(),
        }

        // Добавляем в начало и ограничиваем размер
        const updated = [newEntry, ...filtered].slice(0, MAX_FOLDERS)

        saveToStorage(updated)
        return updated
      })
    },
    [saveToStorage],
  )

  /**
   * Удалить папку из истории
   */
  const removeFolder = useCallback(
    (folderPath: string) => {
      setHistory((prev) => {
        const updated = prev.filter((entry) => entry.folderPath !== folderPath)
        saveToStorage(updated)
        return updated
      })
    },
    [saveToStorage],
  )

  /**
   * Очистить всю историю
   */
  const clearHistory = useCallback(() => {
    setHistory([])
    saveToStorage([])
  }, [saveToStorage])

  /**
   * Получить последнюю открытую папку
   */
  const getLastFolder = useCallback((): FolderHistoryEntry | null => {
    return history[0] ?? null
  }, [history])

  /**
   * Получить всю историю
   */
  const getHistory = useCallback((): FolderHistoryStorage => {
    return [...history]
  }, [history])

  return {
    /** История папок (отсортирована по времени — новые первые) */
    history,
    /** Добавить папку в историю */
    addFolder,
    /** Удалить папку из истории */
    removeFolder,
    /** Очистить всю историю */
    clearHistory,
    /** Получить последнюю открытую папку */
    getLastFolder,
    /** Получить всю историю */
    getHistory,
  }
}
