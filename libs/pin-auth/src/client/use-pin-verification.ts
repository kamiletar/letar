'use client'

import { useCallback, useState } from 'react'
import { useResendCountdown } from './use-resend-countdown'
import { useVerificationStream } from './use-verification-stream'

export type PinVerificationState = 'idle' | 'verifying' | 'verified' | 'error'

export interface UsePinVerificationConfig {
  /** Email пользователя */
  email: string
  /** Длина PIN-кода (по умолчанию 6) */
  pinLength?: number
  /** Время cooldown для повторной отправки в секундах (по умолчанию 60) */
  resendCooldownSeconds?: number
  /** URL для SSE верификации */
  verificationStreamUrl?: string
  /** Callback при успешной верификации */
  onVerified?: (token: string) => void | Promise<void>
  /** Callback при верификации в другой вкладке */
  onVerifiedInOtherTab?: () => void
}

export interface UsePinVerificationResult {
  /** Текущее состояние верификации */
  state: PinVerificationState
  /** Сообщение об ошибке */
  error: string
  /** Верификация произошла в другой вкладке */
  verifiedInOtherTab: boolean
  /** Идёт проверка PIN */
  isVerifying: boolean
  /** Идёт повторная отправка */
  isResending: boolean
  /** Можно ли отправить повторно */
  canResend: boolean
  /** Секунды до повторной отправки */
  resendSecondsLeft: number
  /** Key для сброса формы */
  formKey: number
  /** Проверить PIN */
  verifyPin: (pin: string) => Promise<void>
  /** Отправить PIN повторно */
  resendPin: () => Promise<void>
  /** Сбросить ошибку */
  clearError: () => void
}

export interface PinVerificationActions {
  /** Server action для верификации PIN */
  onVerifyPin: (
    email: string,
    pin: string
  ) => Promise<{ success: true; token: string } | { success: false; error: string }>
  /** Server action для повторной отправки PIN */
  onResendPin: (email: string) => Promise<{ success: true } | { success: false; error: string }>
}

/**
 * Хук для управления процессом верификации PIN-кода.
 *
 * Объединяет логику проверки PIN, повторной отправки, SSE и состояния формы.
 *
 * @example
 * ```tsx
 * const {
 *   state,
 *   error,
 *   isVerifying,
 *   canResend,
 *   resendSecondsLeft,
 *   verifyPin,
 *   resendPin,
 * } = usePinVerification({
 *   email,
 *   onVerified: (token) => autoLogin(token),
 * }, {
 *   onVerifyPin: verifyPinAction,
 *   onResendPin: resendPinAction,
 * })
 * ```
 */
export function usePinVerification(
  config: UsePinVerificationConfig,
  actions: PinVerificationActions
): UsePinVerificationResult {
  const {
    email,
    pinLength = 6,
    resendCooldownSeconds = 60,
    verificationStreamUrl,
    onVerified,
    onVerifiedInOtherTab,
  } = config

  const [state, setState] = useState<PinVerificationState>('idle')
  const [error, setError] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [formKey, setFormKey] = useState(0)

  // Таймер для повторной отправки
  const {
    secondsLeft: resendSecondsLeft,
    canResend,
    reset: resetCountdown,
  } = useResendCountdown({ initialSeconds: resendCooldownSeconds })

  // SSE для отслеживания верификации
  const { verifiedInOtherTab } = useVerificationStream({
    email,
    streamUrl: verificationStreamUrl,
    onVerified: onVerifiedInOtherTab,
  })

  // Проверка PIN
  const verifyPin = useCallback(
    async (pin: string) => {
      if (pin.length !== pinLength) {
        setError(`Введите ${pinLength}-значный код`)
        return
      }

      setState('verifying')
      setError('')

      try {
        const result = await actions.onVerifyPin(email, pin)

        if (result.success) {
          setState('verified')
          await onVerified?.(result.token)
        } else {
          setState('error')
          setError(getPinErrorMessage(result.error))
        }
      } catch {
        setState('error')
        setError('Произошла ошибка. Попробуйте ещё раз.')
      }
    },
    [email, pinLength, actions, onVerified]
  )

  // Повторная отправка
  const resendPin = useCallback(async () => {
    setIsResending(true)
    setError('')

    try {
      const result = await actions.onResendPin(email)

      if (result.success) {
        resetCountdown()
        setFormKey((k) => k + 1) // Сброс формы
      } else {
        setError(getResendErrorMessage(result.error))
      }
    } catch {
      setError('Не удалось отправить код')
    } finally {
      setIsResending(false)
    }
  }, [email, actions, resetCountdown])

  const clearError = useCallback(() => {
    setError('')
    if (state === 'error') {
      setState('idle')
    }
  }, [state])

  return {
    state,
    error,
    verifiedInOtherTab,
    isVerifying: state === 'verifying',
    isResending,
    canResend,
    resendSecondsLeft,
    formKey,
    verifyPin,
    resendPin,
    clearError,
  }
}

/**
 * Преобразует ошибку верификации PIN в понятное сообщение.
 */
function getPinErrorMessage(error: string): string {
  switch (error) {
    case 'INVALID_PIN':
      return 'Неверный код'
    case 'PIN_EXPIRED':
      return 'Код истёк. Запросите новый код.'
    case 'TOO_MANY_ATTEMPTS':
      return 'Слишком много попыток. Подождите 15 минут.'
    case 'NOT_FOUND':
      return 'Код не найден. Запросите новый код.'
    case 'USER_NOT_FOUND':
      return 'Пользователь не найден.'
    default:
      return 'Произошла ошибка. Попробуйте ещё раз.'
  }
}

/**
 * Преобразует ошибку повторной отправки в понятное сообщение.
 */
function getResendErrorMessage(error: string): string {
  switch (error) {
    case 'RATE_LIMITED':
      return 'Подождите перед повторной отправкой'
    case 'ALREADY_VERIFIED':
      return 'Email уже подтверждён'
    case 'NOT_FOUND':
      return 'Пользователь не найден'
    default:
      return 'Не удалось отправить код'
  }
}
