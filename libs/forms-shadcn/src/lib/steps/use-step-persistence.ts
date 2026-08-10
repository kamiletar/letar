'use client'

import { useCallback, useEffect, useRef } from 'react'

const STORAGE_PREFIX = 'form-steps-shadcn:'

export interface StepPersistenceConfig {
  /** Уникальный ключ localStorage (уникален на форму) */
  key: string
  /** Задержка debounce сохранения в мс (по умолчанию 300) */
  debounceMs?: number
}

export interface UseStepPersistenceResult {
  getPersistedStep: () => number | null
  clearPersistence: () => void
}

/**
 * Хук персистенции текущего шага в `localStorage`. Портировано из Chakra-версии без изменений —
 * framework-free, только `localStorage`. Ключ префикса свой (`form-steps-shadcn:`, не
 * `form-steps:`) — чтобы не путать с сохранённым прогрессом Chakra-скина в том же приложении.
 */
export function useStepPersistence(currentStep: number, config?: StepPersistenceConfig): UseStepPersistenceResult {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const configRef = useRef(config)
  configRef.current = config

  const getPersistedStep = useCallback((): number | null => {
    const cfg = configRef.current
    if (!cfg || typeof window === 'undefined') { return null }
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${cfg.key}`)
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed) && parsed >= 0) { return parsed }
      }
    } catch {
      // Invalid or localStorage error — ignore
    }
    return null
  }, [])

  useEffect(() => {
    const cfg = configRef.current
    if (!cfg || typeof window === 'undefined') { return }

    const debounceMs = cfg.debounceMs ?? 300
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current) }

    debounceTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${cfg.key}`, String(currentStep))
      } catch {
        // localStorage may be full or disabled
      }
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current) }
    }
  }, [currentStep])

  const clearPersistence = useCallback(() => {
    const cfg = configRef.current
    if (!cfg || typeof window === 'undefined') { return }
    if (debounceTimerRef.current) { clearTimeout(debounceTimerRef.current) }
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${cfg.key}`)
    } catch {
      // Ignore errors
    }
  }, [])

  return { getPersistedStep, clearPersistence }
}
