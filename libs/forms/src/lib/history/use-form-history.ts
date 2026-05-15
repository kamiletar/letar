'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormHistoryConfig, HistoryEntry, UseFormHistoryResult } from './types'

/**
 * useFormHistory — Undo/Redo для форм.
 *
 * Подписывается на изменения TanStack Form store,
 * записывает снапшоты с debounce, поддерживает keyboard shortcuts.
 *
 * @example
 * ```tsx
 * const { undo, redo, canUndo, canRedo } = useFormHistory(form, {
 *   maxHistory: 50,
 *   debounceMs: 500,
 *   keyboard: true,
 * })
 * ```
 */
export function useFormHistory<T>(
  form: {
    state: { values: T }
    store: { subscribe: (cb: () => void) => () => void }
    setFieldValue: (field: string, value: unknown) => void
    reset: () => void
  },
  config?: FormHistoryConfig
): UseFormHistoryResult<T> {
  const {
    maxHistory = 50,
    debounceMs = 500,
    persist = false,
    persistKey = 'form-history',
    keyboard = true,
  } = config ?? {}

  const [history, setHistory] = useState<HistoryEntry<T>[]>(() => {
    // Восстановление из sessionStorage
    if (persist && typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(persistKey)
        if (saved) return JSON.parse(saved)
      } catch {
        /* игнорируем ошибки парсинга */
      }
    }
    return [{ values: form.state.values, timestamp: Date.now() }]
  })

  const [currentIndex, setCurrentIndex] = useState(() => {
    if (persist && typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(`${persistKey}-index`)
        if (saved) return parseInt(saved, 10)
      } catch {
        /* игнорируем */
      }
    }
    return 0
  })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isUndoRedoRef = useRef(false)

  // Записать новый снапшот в историю
  const pushSnapshot = useCallback(
    (values: T) => {
      setHistory((prev) => {
        // Обрезаем "будущее" при ветвлении
        const base = prev.slice(0, currentIndex + 1)
        const entry: HistoryEntry<T> = { values: structuredClone(values), timestamp: Date.now() }
        const next = [...base, entry]
        // Ограничиваем размер
        const trimmed = next.length > maxHistory ? next.slice(next.length - maxHistory) : next
        return trimmed
      })
      setCurrentIndex((prev) => {
        const newIndex = Math.min(prev + 1, maxHistory - 1)
        return newIndex
      })
    },
    [currentIndex, maxHistory]
  )

  // Подписка на изменения формы с debounce
  useEffect(() => {
    const unsub = form.store.subscribe(() => {
      if (isUndoRedoRef.current) return // Не записываем изменения от undo/redo

      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        pushSnapshot(form.state.values)
      }, debounceMs)
    })

    return () => {
      unsub()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [form.store, form.state.values, debounceMs, pushSnapshot])

  // Persist в sessionStorage
  useEffect(() => {
    if (!persist) return
    try {
      sessionStorage.setItem(persistKey, JSON.stringify(history))
      sessionStorage.setItem(`${persistKey}-index`, String(currentIndex))
    } catch {
      /* sessionStorage может быть полон */
    }
  }, [history, currentIndex, persist, persistKey])

  // Применить снапшот из истории к форме
  const applySnapshot = useCallback(
    (entry: HistoryEntry<T>) => {
      isUndoRedoRef.current = true
      const values = entry.values as Record<string, unknown>
      for (const [key, value] of Object.entries(values)) {
        form.setFieldValue(key, value)
      }
      // Сбросить флаг после микротаска (чтобы subscribe не сработал)
      setTimeout(() => {
        isUndoRedoRef.current = false
      }, 0)
    },
    [form]
  )

  const undo = useCallback(() => {
    if (currentIndex <= 0) return
    const newIndex = currentIndex - 1
    setCurrentIndex(newIndex)
    applySnapshot(history[newIndex])
  }, [currentIndex, history, applySnapshot])

  const redo = useCallback(() => {
    if (currentIndex >= history.length - 1) return
    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)
    applySnapshot(history[newIndex])
  }, [currentIndex, history, applySnapshot])

  const clear = useCallback(() => {
    const initial: HistoryEntry<T> = { values: form.state.values, timestamp: Date.now() }
    setHistory([initial])
    setCurrentIndex(0)
    if (persist) {
      try {
        sessionStorage.removeItem(persistKey)
        sessionStorage.removeItem(`${persistKey}-index`)
      } catch {
        /* игнорируем */
      }
    }
  }, [form.state.values, persist, persistKey])

  // Keyboard shortcuts
  useEffect(() => {
    if (!keyboard || typeof window === 'undefined') return

    const handler = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey
      if (!isCtrl) return

      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [keyboard, undo, redo])

  return {
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    currentIndex,
    historyLength: history.length,
    clear,
    history,
  }
}
