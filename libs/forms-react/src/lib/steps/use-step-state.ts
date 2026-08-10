'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { StepInfo } from './step-types'

/**
 * Результат useStepState
 */
export interface UseStepStateResult {
  /** Зарегистрированные шаги, отсортированные по индексу */
  sortedSteps: StepInfo[]
  /** Количество шагов */
  stepCount: number
  /** Зарегистрировать шаг */
  registerStep: (step: StepInfo) => void
  /** Дерегистрировать шаг */
  unregisterStep: (index: number) => void
  /** Shared mutable ref для атомарного назначения уникальных индексов шагам */
  claimedIndicesRef: React.RefObject<Set<number>>
  /** Скрытые поля (исключены из валидации, интеграция с Form.When) */
  hiddenFields: Set<string>
  /** Скрыть поля от валидации */
  hideFieldsFromValidation: (fieldNames: string[]) => void
  /** Показать поля для валидации */
  showFieldsForValidation: (fieldNames: string[]) => void
}

/**
 * Хук управления состоянием шагов Form.Steps — регистрация/дерегистрация,
 * сортировка по индексу, скрытые поля для Form.When-интеграции.
 *
 * `hiddenFields`/`hideFieldsFromValidation`/`showFieldsForValidation` востребованы только скином,
 * который реализует Form.When — остальные скины просто не вызывают сеттеры, и множество остаётся
 * пустым (см. `useStepNavigation` — фильтрация по пустому множеству не меняет поведение).
 */
export function useStepState(): UseStepStateResult {
  const [steps, setSteps] = useState<StepInfo[]>([])

  // Shared mutable ref для атомарного назначения индексов шагам.
  // Решает race condition: useEffect-ы всех Step запускаются последовательно
  // в одном коммите, но state (steps) ещё не обновлён. Ref мутируется
  // синхронно — каждый следующий Step видит уже занятые индексы.
  const claimedIndicesRef = useRef<Set<number>>(new Set())

  // Скрытые поля (исключены из валидации через Form.When)
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set())

  const sortedSteps = useMemo(() => [...steps].sort((a, b) => a.index - b.index), [steps])
  const stepCount = sortedSteps.length

  const registerStep = useCallback((step: StepInfo) => {
    setSteps((prev) => {
      const existing = prev.findIndex((s) => s.index === step.index)
      if (existing >= 0) {
        const old = prev[existing]
        // Сравнение значимых полей — если не изменились, не обновлять state
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

  const hideFieldsFromValidation = useCallback((fieldNames: string[]) => {
    setHiddenFields((prev) => {
      const next = new Set(prev)
      for (const name of fieldNames) {
        next.add(name)
      }
      return next
    })
  }, [])

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
