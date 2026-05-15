'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Конфигурация серверного автосохранения.
 */
export interface FormAutosaveConfig {
  /** URL endpoint для сохранения (POST/PUT) */
  endpoint: string
  /** Интервал автосохранения (мс, по умолчанию 5000) */
  interval?: number
  /** Debounce: минимальный интервал между запросами (мс, по умолчанию 1000) */
  debounce?: number
  /** ID черновика (для восстановления) */
  draftId?: string
  /** HTTP метод (по умолчанию POST) */
  method?: 'POST' | 'PUT' | 'PATCH'
  /** Дополнительные headers */
  headers?: Record<string, string>
  /** Callback при успешном сохранении */
  onSave?: (response: unknown) => void
  /** Callback при ошибке */
  onError?: (error: Error) => void
}

/**
 * Состояние автосохранения.
 */
export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/**
 * Результат хука useFormAutosave.
 */
export interface UseFormAutosaveResult {
  /** Текущий статус */
  status: AutosaveStatus
  /** Время последнего сохранения */
  lastSavedAt: Date | null
  /** Текст ошибки */
  error: string | null
  /** Принудительно сохранить сейчас */
  saveNow: () => Promise<void>
  /** Загрузить черновик с сервера */
  loadDraft: () => Promise<Record<string, unknown> | null>
}

/**
 * Хук серверного автосохранения формы.
 *
 * Периодически отправляет данные формы на сервер с debounce.
 * Поддерживает восстановление черновиков и fallback на localStorage.
 *
 * @example
 * ```tsx
 * const autosave = useFormAutosave(form, {
 *   endpoint: '/api/drafts',
 *   draftId: 'application-123',
 *   interval: 5000,
 * })
 * ```
 */
export function useFormAutosave(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: any,
  config: FormAutosaveConfig
): UseFormAutosaveResult {
  const { endpoint, interval = 5000, debounce = 1000, draftId, method = 'POST', headers = {}, onSave, onError } = config

  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const lastSavedDataRef = useRef<string>('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /** Отправить данные на сервер */
  const save = useCallback(
    async (data: unknown) => {
      const serialized = JSON.stringify(data)

      // Не сохраняем если данные не изменились
      if (serialized === lastSavedDataRef.current) return

      // Fallback на localStorage если нет сети
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        if (draftId) {
          try {
            localStorage.setItem(`autosave:${draftId}`, serialized)
          } catch {
            /* квота localStorage */
          }
        }
        return
      }

      setStatus('saving')
      setError(null)

      try {
        const url = draftId ? `${endpoint}?draftId=${encodeURIComponent(draftId)}` : endpoint
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: serialized,
        })

        if (!response.ok) {
          throw new Error(`Autosave failed: ${response.status}`)
        }

        const result = await response.json().catch(() => null)
        lastSavedDataRef.current = serialized
        setStatus('saved')
        setLastSavedAt(new Date())
        onSave?.(result)

        // Очищаем localStorage fallback при успешном сохранении
        if (draftId) {
          try {
            localStorage.removeItem(`autosave:${draftId}`)
          } catch {
            /* игнорируем */
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Ошибка сохранения'
        setStatus('error')
        setError(errorMsg)
        onError?.(err instanceof Error ? err : new Error(errorMsg))

        // Fallback на localStorage при ошибке сети
        if (draftId) {
          try {
            localStorage.setItem(`autosave:${draftId}`, serialized)
          } catch {
            /* квота localStorage */
          }
        }
      }
    },
    [endpoint, method, headers, draftId, onSave, onError]
  )

  /** Принудительное сохранение */
  const saveNow = useCallback(async () => {
    const values = form.state.values
    await save(values)
  }, [form, save])

  /** Загрузить черновик с сервера */
  const loadDraft = useCallback(async (): Promise<Record<string, unknown> | null> => {
    if (!draftId) return null

    // Сначала пробуем сервер
    if (typeof navigator === 'undefined' || navigator.onLine) {
      try {
        const url = `${endpoint}?draftId=${encodeURIComponent(draftId)}`
        const response = await fetch(url)
        if (response.ok) {
          const data = await response.json()
          return data as Record<string, unknown>
        }
      } catch {
        /* fallback на localStorage */
      }
    }

    // Fallback на localStorage
    try {
      const stored = localStorage.getItem(`autosave:${draftId}`)
      if (stored) return JSON.parse(stored) as Record<string, unknown>
    } catch {
      /* ничего */
    }

    return null
  }, [endpoint, draftId])

  /** Периодическое автосохранение */
  useEffect(() => {
    const tick = () => {
      // Debounce: не сохраняем чаще чем debounce мс
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const values = form.state.values
        save(values)
      }, debounce)
    }

    timerRef.current = setInterval(tick, interval)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [form, save, interval, debounce])

  return { status, lastSavedAt, error, saveNow, loadDraft }
}
