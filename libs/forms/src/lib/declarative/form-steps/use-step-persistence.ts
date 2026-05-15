'use client'

import { useCallback, useEffect, useRef } from 'react'

const STORAGE_PREFIX = 'form-steps:'

/**
 * Form step persistence configuration
 */
export interface StepPersistenceConfig {
  /**
   * Unique key for localStorage
   * Must be unique per form
   */
  key: string

  /**
   * Debounce delay for saving in milliseconds
   * @default 300
   */
  debounceMs?: number
}

/**
 * Result of useStepPersistence hook
 */
export interface UseStepPersistenceResult {
  /** Get persisted step from localStorage */
  getPersistedStep: () => number | null
  /** Clear persisted step */
  clearPersistence: () => void
}

/**
 * Hook for persisting current step in localStorage
 *
 * Saves and restores the current step index automatically.
 * Uses debounce to optimize writes.
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
  // Use ref for config — prevents useEffect restart
  // on every render due to object reference change
  const configRef = useRef(config)
  configRef.current = config

  // Get persisted step on mount
  const getPersistedStep = useCallback((): number | null => {
    const cfg = configRef.current
    if (!cfg || typeof window === 'undefined') {
      return null
    }
    try {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${cfg.key}`)
      if (stored) {
        const parsed = parseInt(stored, 10)
        if (!isNaN(parsed) && parsed >= 0) {
          return parsed
        }
      }
    } catch {
      // Invalid or localStorage error — ignore
    }
    return null
  }, [])

  // Save step with debounce — depends only on currentStep
  useEffect(() => {
    const cfg = configRef.current
    if (!cfg || typeof window === 'undefined') {
      return
    }

    const debounceMs = cfg.debounceMs ?? 300

    // Cancel previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Debounced save
    debounceTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(`${STORAGE_PREFIX}${cfg.key}`, String(currentStep))
      } catch {
        // localStorage may be full or disabled
      }
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [currentStep])

  // Clear persistence (call after successful form submission)
  const clearPersistence = useCallback(() => {
    const cfg = configRef.current
    if (!cfg || typeof window === 'undefined') {
      return
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${cfg.key}`)
    } catch {
      // Ignore errors
    }
  }, [])

  return { getPersistedStep, clearPersistence }
}
