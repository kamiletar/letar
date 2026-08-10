'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { StepInfo } from './form-steps-context'

export interface UseStepStateResult {
  sortedSteps: StepInfo[]
  stepCount: number
  registerStep: (step: StepInfo) => void
  unregisterStep: (index: number) => void
  claimedIndicesRef: React.RefObject<Set<number>>
}

/**
 * Хук управления состоянием шагов — регистрация/дерегистрация, сортировка по индексу.
 * Портировано из Chakra-версии (`libs/forms/.../form-steps/use-step-state.ts`) без изменений —
 * framework-free логика, не зависит от UI-библиотеки.
 */
export function useStepState(): UseStepStateResult {
  const [steps, setSteps] = useState<StepInfo[]>([])

  // Shared mutable ref для атомарного назначения индексов шагам — решает race condition,
  // когда все useEffect регистрации шагов видят ещё не обновлённый state.
  const claimedIndicesRef = useRef<Set<number>>(new Set())

  const sortedSteps = useMemo(() => [...steps].sort((a, b) => a.index - b.index), [steps])
  const stepCount = sortedSteps.length

  const registerStep = useCallback((step: StepInfo) => {
    setSteps((prev) => {
      const existing = prev.findIndex((s) => s.index === step.index)
      if (existing >= 0) {
        const old = prev[existing]
        if (
          old.title === step.title
          && old.description === step.description
          && old.fieldNames.length === step.fieldNames.length
          && old.fieldNames.every((f, i) => f === step.fieldNames[i])
        ) {
          return prev
        }
        const next = [...prev]
        next[existing] = step
        return next
      }
      return [...prev, step]
    })
  }, [])

  const unregisterStep = useCallback((index: number) => {
    claimedIndicesRef.current.delete(index)
    setSteps((prev) => prev.filter((s) => s.index !== index))
  }, [])

  return { sortedSteps, stepCount, registerStep, unregisterStep, claimedIndicesRef }
}
