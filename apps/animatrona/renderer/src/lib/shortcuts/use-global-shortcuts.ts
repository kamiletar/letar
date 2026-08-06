'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'

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

  // Колбэки читаются из ref, а не из замыкания — вызывающий код (AppShell) передаёт
  // новый объект callbacks на каждый рендер (инлайн-функции), и если бы handleKeyDown
  // зависел от него напрямую, addEventListener/removeEventListener на window дёргались
  // бы при каждом рендере always-mounted layout вместо одного раза на весь app lifecycle.
  const callbacksRef = useRef(callbacks)
  callbacksRef.current = callbacks

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
        callbacksRef.current.onCommandPalette?.()
        return
      }

      // / — Quick Search (альтернативный хоткей)
      if (!ctrl && !shift && key === '/') {
        e.preventDefault()
        callbacksRef.current.onCommandPalette?.()
        return
      }

      // Ctrl+I — Импорт видео (code для работы в русской раскладке)
      if (ctrl && code === 'KeyI') {
        e.preventDefault()
        callbacksRef.current.onImport?.()
        return
      }

      // Ctrl+/ — Показать хоткеи
      if (ctrl && key === '/') {
        e.preventDefault()
        callbacksRef.current.onShowShortcuts?.()
        return
      }

      // Escape — Закрыть модальное окно
      if (key === 'escape') {
        callbacksRef.current.onEscape?.()
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
    [router],
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
