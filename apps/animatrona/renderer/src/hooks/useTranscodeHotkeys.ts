'use client'

/**
 * useTranscodeHotkeys — Keyboard shortcuts для страницы транскодирования
 *
 * Шорткаты:
 * - Ctrl+Shift+P — Пауза/Возобновление очереди
 * - Ctrl+Shift+C — Очистить завершённые
 * - Ctrl+Shift+S — Начать очередь
 */

import { useEffect } from 'react'

interface UseTranscodeHotkeysOptions {
  /** Callback для toggle pause/resume */
  onTogglePause?: () => void
  /** Callback для очистки завершённых */
  onClearCompleted?: () => void
  /** Callback для старта очереди */
  onStart?: () => void
  /** Отключить хоткеи */
  disabled?: boolean
}

/**
 * Hook для обработки keyboard shortcuts
 *
 * @example
 * ```tsx
 * useTranscodeHotkeys({
 *   onTogglePause: () => isPaused ? resume() : pause(),
 *   onClearCompleted: clearCompleted,
 *   onStart: start,
 * })
 * ```
 */
export function useTranscodeHotkeys(options: UseTranscodeHotkeysOptions): void {
  const { onTogglePause, onClearCompleted, onStart, disabled = false } = options

  useEffect(() => {
    if (disabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Игнорируем если фокус в input/textarea
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      // Ctrl+Shift+P — Пауза/Возобновление
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        onTogglePause?.()
        return
      }

      // Ctrl+Shift+C — Очистить завершённые
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'c') {
        event.preventDefault()
        onClearCompleted?.()
        return
      }

      // Ctrl+Shift+S — Начать очередь
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 's') {
        event.preventDefault()
        onStart?.()
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [disabled, onTogglePause, onClearCompleted, onStart])
}
