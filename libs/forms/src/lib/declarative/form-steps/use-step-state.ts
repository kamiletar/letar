'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { StepInfo } from './form-steps-context'

/**
 * Result of useStepState hook
 */
export interface UseStepStateResult {
  /** Registered steps, sorted by index */
  sortedSteps: StepInfo[]
  /** Number of steps */
  stepCount: number
  /** Register a step */
  registerStep: (step: StepInfo) => void
  /** Unregister a step */
  unregisterStep: (index: number) => void
  /** Shared mutable ref для атомарного назначения уникальных индексов шагам */
  claimedIndicesRef: React.RefObject<Set<number>>
  /** Hidden fields (excluded from validation) */
  hiddenFields: Set<string>
  /** Hide fields from validation */
  hideFieldsFromValidation: (fieldNames: string[]) => void
  /** Show fields for validation */
  showFieldsForValidation: (fieldNames: string[]) => void
}

/**
 * Hook for managing step state
 *
 * Manages:
 * - Step registration/unregistration
 * - Sorting steps by index
 * - Hidden fields (for Form.When integration)
 *
 * @example
 * ```tsx
 * const {
 *   sortedSteps,
 *   stepCount,
 *   registerStep,
 *   unregisterStep,
 *   hiddenFields,
 *   hideFieldsFromValidation,
 *   showFieldsForValidation
 * } = useStepState()
 * ```
 */
export function useStepState(): UseStepStateResult {
  // Registered steps
  const [steps, setSteps] = useState<StepInfo[]>([])

  // Shared mutable ref для атомарного назначения индексов шагам.
  // Решает race condition: useEffect-ы всех Step запускаются последовательно
  // в одном коммите, но state (steps) ещё не обновлён. Ref мутируется
  // синхронно — каждый следующий Step видит уже занятые индексы.
  const claimedIndicesRef = useRef<Set<number>>(new Set())

  // Hidden fields (excluded from validation via Form.When)
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set())

  // Sort steps by index
  const sortedSteps = useMemo(() => [...steps].sort((a, b) => a.index - b.index), [steps])

  const stepCount = sortedSteps.length

  // Register step (with change detection — prevents unnecessary re-renders)
  const registerStep = useCallback((step: StepInfo) => {
    setSteps((prev) => {
      const existing = prev.findIndex((s) => s.index === step.index)
      if (existing >= 0) {
        const old = prev[existing]
        // Compare significant fields — if unchanged, don't update state
        if (
          old.title === step.title
          && old.description === step.description
          && old.fieldNames.length === step.fieldNames.length
          && old.fieldNames.every((f, i) => f === step.fieldNames[i])
        ) {
          return prev // No changes — return the same object
        }
        const next = [...prev]
        next[existing] = step
        return next
      }
      return [...prev, step]
    })
  }, [])

  // Unregister step
  const unregisterStep = useCallback((index: number) => {
    claimedIndicesRef.current.delete(index)
    setSteps((prev) => prev.filter((s) => s.index !== index))
  }, [])

  // Hide fields from validation (called from Form.When when hiding)
  const hideFieldsFromValidation = useCallback((fieldNames: string[]) => {
    setHiddenFields((prev) => {
      const next = new Set(prev)
      for (const name of fieldNames) {
        next.add(name)
      }
      return next
    })
  }, [])

  // Show fields for validation (called from Form.When when showing)
  const showFieldsForValidation = useCallback((fieldNames: string[]) => {
    setHiddenFields((prev) => {
      const next = new Set(prev)
      for (const name of fieldNames) {
        next.delete(name)
      }
      return next
    })
  }, [])

  return {
    sortedSteps,
    stepCount,
    registerStep,
    unregisterStep,
    claimedIndicesRef,
    hiddenFields,
    hideFieldsFromValidation,
    showFieldsForValidation,
  }
}
