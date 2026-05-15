'use client'

import { useCallback, useEffect, useState } from 'react'

export interface UseResendCountdownConfig {
  /** Начальное значение таймера в секундах (по умолчанию 60) */
  initialSeconds?: number
}

export interface UseResendCountdownResult {
  /** Оставшееся количество секунд */
  secondsLeft: number
  /** Можно ли отправить повторно */
  canResend: boolean
  /** Сбросить таймер на начальное значение */
  reset: () => void
  /** Начать отсчёт с указанного значения */
  start: (seconds?: number) => void
}

/**
 * Хук для управления таймером между повторными отправками.
 *
 * @example
 * ```tsx
 * const { secondsLeft, canResend, reset } = useResendCountdown({ initialSeconds: 60 })
 *
 * const handleResend = async () => {
 *   await resendPin()
 *   reset()
 * }
 *
 * return canResend ? (
 *   <Button onClick={handleResend}>Отправить повторно</Button>
 * ) : (
 *   <Text>Повторно через {secondsLeft} сек</Text>
 * )
 * ```
 */
export function useResendCountdown(config: UseResendCountdownConfig = {}): UseResendCountdownResult {
  const { initialSeconds = 60 } = config
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds)

  // Обратный отсчёт
  useEffect(() => {
    if (secondsLeft <= 0) {
      return
    }

    const timer = setTimeout(() => {
      setSecondsLeft((prev) => prev - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [secondsLeft])

  const reset = useCallback(() => {
    setSecondsLeft(initialSeconds)
  }, [initialSeconds])

  const start = useCallback(
    (seconds?: number) => {
      setSecondsLeft(seconds ?? initialSeconds)
    },
    [initialSeconds]
  )

  return {
    secondsLeft,
    canResend: secondsLeft <= 0,
    reset,
    start,
  }
}
