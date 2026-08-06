'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Интерфейс закладки.
 */
export interface Bookmark {
  /** ID закладки (docSlug-articleNumber) */
  id: string
  /** Заголовок документа */
  title: string
  /** Номер статьи */
  articleNumber: string
  /** URL статьи */
  href: string
  /** Категория документа */
  category: string
  /** Дата добавления */
  addedAt: string
}

const STORAGE_KEY = 'pravda-bookmarks'

/**
 * Кеш для результата getBookmarks.
 * useSyncExternalStore требует стабильной ссылки на объект.
 */
let cachedBookmarks: Bookmark[] = []
let cachedJson: string | null = null

/**
 * Сбрасывает кеш закладок. Используется в тестах.
 * @internal
 */
export function __resetBookmarksCache(): void {
  cachedBookmarks = []
  cachedJson = null
}

/**
 * Получает закладки из localStorage.
 * Кеширует результат для предотвращения infinite loop в useSyncExternalStore.
 */
function getBookmarks(): Bookmark[] {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    // Возвращаем закешированный массив если данные не изменились
    if (stored === cachedJson) {
      return cachedBookmarks
    }
    // Обновляем кеш
    cachedJson = stored
    cachedBookmarks = stored ? JSON.parse(stored) : []
    return cachedBookmarks
  } catch {
    return []
  }
}

/**
 * Сохраняет закладки в localStorage.
 */
function setBookmarks(bookmarks: Bookmark[]): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))
    // Уведомляем подписчиков об изменении
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
  } catch {
    // Игнорируем ошибки записи
  }
}

/**
 * Подписка на изменения localStorage.
 */
function subscribe(callback: () => void): () => void {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      callback()
    }
  }
  window.addEventListener('storage', handleStorage)
  return () => window.removeEventListener('storage', handleStorage)
}

/**
 * Хук для работы с закладками.
 * Использует useSyncExternalStore для синхронизации с localStorage.
 */
export function useBookmarks() {
  const bookmarks = useSyncExternalStore(
    subscribe,
    getBookmarks,
    () => [], // SSR fallback
  )

  /**
   * Добавляет закладку.
   */
  const addBookmark = useCallback((bookmark: Omit<Bookmark, 'addedAt'>) => {
    const current = getBookmarks()
    const exists = current.some((b) => b.id === bookmark.id)
    if (!exists) {
      const newBookmark: Bookmark = {
        ...bookmark,
        addedAt: new Date().toISOString(),
      }
      setBookmarks([newBookmark, ...current])
    }
  }, [])

  /**
   * Удаляет закладку по ID.
   */
  const removeBookmark = useCallback((id: string) => {
    const current = getBookmarks()
    setBookmarks(current.filter((b) => b.id !== id))
  }, [])

  /**
   * Проверяет, добавлена ли закладка.
   */
  const isBookmarked = useCallback(
    (id: string) => {
      return bookmarks.some((b) => b.id === id)
    },
    [bookmarks],
  )

  /**
   * Переключает состояние закладки.
   */
  const toggleBookmark = useCallback(
    (bookmark: Omit<Bookmark, 'addedAt'>) => {
      if (isBookmarked(bookmark.id)) {
        removeBookmark(bookmark.id)
      } else {
        addBookmark(bookmark)
      }
    },
    [isBookmarked, removeBookmark, addBookmark],
  )

  /**
   * Очищает все закладки.
   */
  const clearBookmarks = useCallback(() => {
    setBookmarks([])
  }, [])

  return {
    bookmarks,
    addBookmark,
    removeBookmark,
    isBookmarked,
    toggleBookmark,
    clearBookmarks,
  }
}
