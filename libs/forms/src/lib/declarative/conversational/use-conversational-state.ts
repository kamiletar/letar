'use client'

import { useCallback, useState } from 'react'

/**
 * Состояние conversational mode.
 */
export interface ConversationalState {
  /** Текущий индекс поля */
  currentIndex: number
  /** Общее количество полей */
  totalFields: number
  /** Перейти к следующему */
  next: () => void
  /** Перейти к предыдущему */
  prev: () => void
  /** Перейти к конкретному */
  goTo: (index: number) => void
  /** На первом поле */
  isFirst: boolean
  /** На последнем поле */
  isLast: boolean
  /** Завершён (прошёл все поля) */
  isCompleted: boolean
  /** Прогресс (0-1) */
  progress: number
}

/**
 * Хук состояния для conversational mode.
 */
export function useConversationalState(totalFields: number): ConversationalState {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)

  const next = useCallback(() => {
    if (currentIndex < totalFields - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      setIsCompleted(true)
    }
  }, [currentIndex, totalFields])

  const prev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
    }
  }, [currentIndex])

  const goTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalFields) {
        setCurrentIndex(index)
        setIsCompleted(false)
      }
    },
    [totalFields]
  )

  return {
    currentIndex,
    totalFields,
    next,
    prev,
    goTo,
    isFirst: currentIndex === 0,
    isLast: currentIndex === totalFields - 1,
    isCompleted,
    progress: totalFields > 0 ? (currentIndex + 1) / totalFields : 0,
  }
}
