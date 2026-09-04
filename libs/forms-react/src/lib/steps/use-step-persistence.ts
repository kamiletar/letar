'use client'

import { useCallback, useEffect, useRef } from 'react'

const DEFAULT_STORAGE_PREFIX = 'form-steps:'

/**
 * Конфигурация персистенции шагов формы
 */
export interface StepPersistenceConfig {
  /**
   * Уникальный ключ для localStorage
   * Должен быть уникален для каждой формы
   */
  key: string

  /**
   * Задержка debounce сохранения в миллисекундах
   * @default 300
   */
  debounceMs?: number

  /**
   * Префикс ключа localStorage — разные скины на одной странице не должны конфликтовать
   * друг с другом (например Chakra- и shadcn-версия одной формы).
   * @default 'form-steps:'
   */
  storagePrefix?: string
}

/**
 * Результат useStepPersistence
 */
export interface UseStepPersistenceResult {
  /** Получить сохранённый шаг из localStorage */
  getPersistedStep: () => number | null
  /** Очистить сохранённый шаг */
  clearPersistence: () => void
}

/**
 * Хук персистенции текущего шага в localStorage
 *
 * Сохраняет и восстанавливает индекс текущего шага автоматически.
 * Использует debounce для оптимизации записи.
 *
 * @example
 * ```tsx
 * const { getPersistedStep, clearPersistence } = useStepPersistence(
 *   currentStep,
 *   { key: 'my-form', debounceMs: 300 }
 * )
 * ```
 */
export function useStepPersistence(currentStep: number, config?: StepPersistenceConfig): UseStepPersistenceResult {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Config через ref — предотвращает перезапуск useEffect
  // на каждый рендер из-за смены ссылки на объект
  const configRef = useRef(config)
  // Синхронизация "последнего значения" в эффекте, не во время рендера — запись в ref.current
  // прямо в теле компонента не позволяет react(refs) (React Compiler может отбросить/повторить
  // рендер, не закоммитив его). Эффект коммитится синхронно после рендера, а конфиг читается
  // только из колбэков (getPersistedStep/clearPersistence) и из useEffect ниже, вызываемых уже
  // после коммита — задержки в один тик тут нет и быть не может.
  useEffect(() => {
    configRef.current = config
  })

  const getPersistedStep = useCallback((): number | null => {
    const cfg = configRef.current
    if (!cfg || typeof window === 'undefined') {
      return null
    }
    try {
      const prefix = cfg.storagePrefix ?? DEFAULT_STORAGE_PREFIX
      const stored = localStorage.getItem(`${prefix}${cfg.key}`)
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed) && parsed >= 0) {
          return parsed
        }
      }
    } catch {
      // Некорректное значение или ошибка localStorage — игнорировать
    }
    return null
  }, [])

  // Сохранение шага с debounce — зависит только от currentStep
  useEffect(() => {
    const cfg = configRef.current
    if (!cfg || typeof window === 'undefined') {
      return
    }

    const debounceMs = cfg.debounceMs ?? 300
    const prefix = cfg.storagePrefix ?? DEFAULT_STORAGE_PREFIX

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(`${prefix}${cfg.key}`, String(currentStep))
      } catch {
        // localStorage может быть переполнен или отключён
      }
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [currentStep])

  // Очистка персистенции (вызывать после успешной отправки формы)
  const clearPersistence = useCallback(() => {
    const cfg = configRef.current
    if (!cfg || typeof window === 'undefined') {
      return
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    try {
      const prefix = cfg.storagePrefix ?? DEFAULT_STORAGE_PREFIX
      localStorage.removeItem(`${prefix}${cfg.key}`)
    } catch {
      // Игнорировать ошибки
    }
  }, [])

  return { getPersistedStep, clearPersistence }
}
