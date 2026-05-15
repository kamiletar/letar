'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Результат верификации PIN-кода
 */
export type VerifyResult = { success: true; token?: string; resetToken?: string } | { success: false; error: string }

/**
 * Результат повторной отправки PIN-кода
 */
export type ResendResult = { success: true } | { success: false; error: string }

/**
 * Типы ошибок PIN-верификации
 */
export type PinError =
  | 'INVALID_PIN'
  | 'PIN_EXPIRED'
  | 'TOO_MANY_ATTEMPTS'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'UNKNOWN_ERROR'

/**
 * Конфигурация для хука PIN-верификации
 */
export interface UsePinVerificationConfig {
  email: string
  sseEndpoint: string
  verifyAction: (email: string, pin: string) => Promise<VerifyResult>
  resendAction: (email: string) => Promise<ResendResult>
  onVerified: (result: { token?: string; resetToken?: string }) => void | Promise<void>
  /**
   * SSE события для разных сценариев
   * - registration: { verified: boolean }
   * - password-reset: { reset: boolean, opened: boolean }
   */
  sseEvents: {
    /** Поле в data для события "завершено в другой вкладке" */
    completedField: string
    /** Поле в data для события "открыто в другой вкладке" (опционально) */
    openedField?: string
  }
}

/**
 * Состояние хука PIN-верификации
 */
export interface PinVerificationState {
  error: string
  isVerifying: boolean
  isResending: boolean
  resendCountdown: number
  canResend: boolean
  isVerified: boolean
  completedInOtherTab: boolean
  openedInOtherTab: boolean
  formKey: number
}

/**
 * Действия хука PIN-верификации
 */
export interface PinVerificationActions {
  handleVerify: (pin: string) => Promise<void>
  handleResend: () => Promise<void>
  closeEventSource: () => void
}

/**
 * Хук для логики PIN-верификации
 * Общий для регистрации и сброса пароля
 */
export function usePinVerification(config: UsePinVerificationConfig): PinVerificationState & PinVerificationActions {
  const { email, sseEndpoint, verifyAction, resendAction, onVerified, sseEvents } = config

  // Состояния
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [completedInOtherTab, setCompletedInOtherTab] = useState(false)
  const [openedInOtherTab, setOpenedInOtherTab] = useState(false)
  const [formKey, setFormKey] = useState(0)

  // Ref для SSE соединения
  const eventSourceRef = useRef<EventSource | null>(null)

  // Таймер для обратного отсчёта resend
  useEffect(() => {
    if (resendCountdown <= 0) {
      setCanResend(true)
      return
    }
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCountdown])

  // SSE подписка для real-time уведомлений
  useEffect(() => {
    const eventSource = new EventSource(sseEndpoint)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)

      // Событие "завершено в другой вкладке"
      if (data[sseEvents.completedField]) {
        eventSource.close()
        eventSourceRef.current = null
        setCompletedInOtherTab(true)
      }

      // Событие "открыто в другой вкладке" (для сброса пароля)
      if (sseEvents.openedField && data[sseEvents.openedField]) {
        setOpenedInOtherTab(true)
      }
    }

    eventSource.onerror = () => {
      // SSE ошибка — не критично, пользователь может использовать пинкод
      eventSource.close()
      eventSourceRef.current = null
    }

    return () => {
      eventSource.close()
      eventSourceRef.current = null
    }
  }, [sseEndpoint, sseEvents.completedField, sseEvents.openedField])

  // Закрытие SSE соединения
  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
  }, [])

  // Проверка пинкода
  const handleVerify = useCallback(
    async (pinValue: string) => {
      if (pinValue.length !== 6) {
        setError('Введите 6-значный код')
        return
      }

      setIsVerifying(true)
      setError('')

      try {
        const result = await verifyAction(email, pinValue)

        if (result.success) {
          // Закрываем SSE до редиректа чтобы избежать race condition
          closeEventSource()
          setIsVerified(true)

          // Вызываем callback с результатом
          // ВАЖНО: redirect() может бросить NEXT_REDIRECT исключение
          await onVerified({ token: result.token, resetToken: result.resetToken })
        } else {
          // Обработка ошибок
          const errorMessages: Record<string, string> = {
            INVALID_PIN: 'Неверный код',
            PIN_EXPIRED: 'Код истёк. Запросите новый код.',
            TOO_MANY_ATTEMPTS: 'Слишком много попыток. Подождите 15 минут.',
          }
          setError(errorMessages[result.error] || 'Произошла ошибка. Попробуйте ещё раз.')

          if (result.error === 'PIN_EXPIRED') {
            setCanResend(true)
          }
          setIsVerifying(false)
        }
      } catch (error) {
        // НЕ перехватываем NEXT_REDIRECT — это исключение Next.js для редиректов
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
          throw error
        }
        // Также проверяем digest для Next.js 14+ формата
        const errorObj = error as { digest?: string }
        if (errorObj.digest?.startsWith('NEXT_REDIRECT')) {
          throw error
        }
        setError('Произошла ошибка. Попробуйте ещё раз.')
        setIsVerifying(false)
      }
    },
    [email, verifyAction, onVerified, closeEventSource]
  )

  // Повторная отправка пинкода
  const handleResend = useCallback(async () => {
    setIsResending(true)
    setError('')

    try {
      const result = await resendAction(email)

      if (result.success) {
        setResendCountdown(60)
        setCanResend(false)
        // Сбрасываем форму через key-based reset
        setFormKey((k) => k + 1)
      } else {
        const errorMessages: Record<string, string> = {
          RATE_LIMITED: 'Подождите перед повторной отправкой',
        }
        setError(errorMessages[result.error] || 'Не удалось отправить код')
      }
    } catch {
      setError('Не удалось отправить код')
    } finally {
      setIsResending(false)
    }
  }, [email, resendAction])

  return {
    // Состояние
    error,
    isVerifying,
    isResending,
    resendCountdown,
    canResend,
    isVerified,
    completedInOtherTab,
    openedInOtherTab,
    formKey,
    // Действия
    handleVerify,
    handleResend,
    closeEventSource,
  }
}
