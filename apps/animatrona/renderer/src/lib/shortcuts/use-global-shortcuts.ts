'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect } from 'react'

import { isInputFocused, NAV_PATHS } from './shortcuts-config'

/** Тип колбэков для глобальных шорткатов */
export interface GlobalShortcutsCallbacks {
  /** Открыть Quick Search (Ctrl+K или /) */
  onCommandPalette?: () => void
  /** Открыть визард импорта (Ctrl+I) */
  onImport?: () => void
  /** Открыть список горячих клавиш (Ctrl+/) */
  onShowShortcuts?: () => void
  /** Закрыть модальное окно (Escape) */
  onEscape?: () => void
}

/**
 * Хук для глобальных горячих клавиш
 *
 * Обрабатывает:
 * - Ctrl+K или / — Quick Search (поиск аниме)
 * - Ctrl+I — Импорт видео
 * - Ctrl+/ — Показать хоткеи
 * - Escape — Закрыть модальное окно
 * - 1-4 — Навигация по секциям
 *
 * @param callbacks — функции для обработки событий
 */
export function useGlobalShortcuts(callbacks: GlobalShortcutsCallbacks = {}) {
  const router = useRouter()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Игнорируем если фокус в текстовом поле
      if (isInputFocused()) {
        return
      }

      const key = e.key.toLowerCase()
      const code = e.code // Физическая клавиша (работает в любой раскладке)
      const ctrl = e.ctrlKey || e.metaKey
      const shift = e.shiftKey

      // Ctrl+K — Quick Search (code для работы в русской раскладке)
      if (ctrl && code === 'KeyK') {
        e.preventDefault()
        callbacks.onCommandPalette?.()
        return
      }

      // / — Quick Search (альтернативный хоткей)
      if (!ctrl && !shift && key === '/') {
        e.preventDefault()
        callbacks.onCommandPalette?.()
        return
      }

      // Ctrl+I — Импорт видео (code для работы в русской раскладке)
      if (ctrl && code === 'KeyI') {
        e.preventDefault()
        callbacks.onImport?.()
        return
      }

      // Ctrl+/ — Показать хоткеи
      if (ctrl && key === '/') {
        e.preventDefault()
        callbacks.onShowShortcuts?.()
        return
      }

      // Escape — Закрыть модальное окно
      if (key === 'escape') {
        callbacks.onEscape?.()
        return
      }

      // Цифры 1-4 для навигации (только без модификаторов)
      if (!ctrl && !shift && ['1', '2', '3', '4'].includes(key)) {
        const index = parseInt(key) - 1
        const path = NAV_PATHS[index]
        if (path) {
          router.push(path)
        }
        return
      }
    },
    [callbacks, router]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
