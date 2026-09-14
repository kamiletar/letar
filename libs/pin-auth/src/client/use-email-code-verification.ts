'use client'

import { useCallback, useState } from 'react'
import { useResendCountdown } from './use-resend-countdown'
import { useVerificationStream } from './use-verification-stream'

export type EmailCodeVerificationStatus = 'idle' | 'verifying' | 'verified' | 'verifiedElsewhere'

export type VerifyResult = { ok: true } | { ok: false; code?: string; message?: string }
export type ResendResult = { ok: true } | { ok: false; code?: string; message?: string }

export interface UseEmailCodeVerificationConfig {
  /** Длина кода (по умолчанию 6) */
  codeLength?: number
  /** Cooldown повторной отправки, секунды (по умолчанию 60) */
  resendCooldownSeconds?: number
  /** URL SSE-потока подтверждения (по умолчанию /api/auth/verification-stream) */
  streamUrl?: string
  /** Включить SSE-подписку (по умолчанию true) */
  streamEnabled?: boolean
  /** Проверка кода — приложение вызывает свой authClient */
  verify: (code: string) => Promise<VerifyResult>
  /** Повторная отправка — приложение вызывает свой authClient */
  resend: () => Promise<ResendResult>
  /** Код принят, сессия создана */
  onVerified: () => void | Promise<void>
  /** Подтверждено в другой вкладке/устройстве */
  onVerifiedInOtherTab?: () => void
}

export interface UseEmailCodeVerificationResult {
  status: EmailCodeVerificationStatus
  error: string
  isVerifying: boolean
  isResending: boolean
  canResend: boolean
  resendSecondsLeft: number
  /** Меняется после успешного resend — передавать как `key` формы кода, чтобы сбросить её */
  formKey: number
  submitCode: (code: string) => Promise<void>
  resendCode: () => Promise<void>
  clearError: () => void
}

function isNextRedirectError(err: unknown): boolean {
  if (!(err instanceof Error)) {
    return false
  }
  const digest = (err as { digest?: unknown }).digest
  return err.message === 'NEXT_REDIRECT' || (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT'))
}

function translateVerifyError(result: { code?: string }, httpStatus?: number): string {
  switch (result.code) {
    case 'INVALID_OTP':
      return 'Неверный код'
    case 'OTP_EXPIRED':
      return 'Код истёк — отправьте новый'
    case 'TOO_MANY_ATTEMPTS':
      return 'Слишком много попыток — отправьте новый код'
    default:
      if (httpStatus === 429 || result.code === 'TOO_MANY_REQUESTS') {
        return 'Слишком часто. Подождите минуту'
      }
      return 'Не удалось проверить код. Попробуйте ещё раз'
  }
}

/**
 * Хук верификации email кодом из письма (PLAN_EMAIL_CODE.md §0.5) — проверка кода, повторная
 * отправка с отсчётом и SSE-подписка на подтверждение в другой вкладке/устройстве.
 *
 * Приложение передаёт `verify`/`resend` как тонкие обёртки над своим `authClient` — хук не знает
 * о конкретном better-auth клиенте.
 */
export function useEmailCodeVerification(config: UseEmailCodeVerificationConfig): UseEmailCodeVerificationResult {
  const {
    resendCooldownSeconds = 60,
    streamUrl,
    streamEnabled = true,
    verify,
    resend,
    onVerified,
    onVerifiedInOtherTab,
  } = config

  const [status, setStatus] = useState<EmailCodeVerificationStatus>('idle')
  const [error, setError] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const {
    secondsLeft: resendSecondsLeft,
    canResend,
    reset: resetCountdown,
  } = useResendCountdown({ initialSeconds: resendCooldownSeconds })

  const { close: closeStream } = useVerificationStream({
    streamUrl,
    enabled: streamEnabled && status !== 'verified' && status !== 'verifiedElsewhere',
    onVerified: () => {
      setStatus('verifiedElsewhere')
      onVerifiedInOtherTab?.()
    },
  })

  const submitCode = useCallback(
    async (code: string) => {
      if (status === 'verifying') {
        return
      }

      // Закрыть поток ДО verify — иначе своя же успешная проверка прилетит как «в другой
      // вкладке» (стрим опрашивает эту же БД). При ошибке поток не переоткрываем осознанно —
      // остаётся ручной ввод и ссылка из письма.
      closeStream()
      setStatus('verifying')
      setError('')

      try {
        const result = await verify(code)
        if (result.ok) {
          setStatus('verified')
          await onVerified()
        } else {
          setStatus('idle')
          setError(translateVerifyError(result))
        }
      } catch (err) {
        if (isNextRedirectError(err)) {
          throw err
        }
        setStatus('idle')
        setError('Не удалось проверить код. Попробуйте ещё раз')
      }
    },
    [status, verify, onVerified, closeStream],
  )

  const resendCode = useCallback(async () => {
    setIsResending(true)
    setError('')

    try {
      const result = await resend()
      if (result.ok) {
        resetCountdown()
        setFormKey((k) => k + 1)
      } else {
        setError(translateVerifyError(result))
      }
    } catch (err) {
      if (isNextRedirectError(err)) {
        throw err
      }
      setError('Не удалось отправить код')
    } finally {
      setIsResending(false)
    }
  }, [resend, resetCountdown])

  const clearError = useCallback(() => setError(''), [])

  return {
    status,
    error,
    isVerifying: status === 'verifying',
    isResending,
    canResend,
    resendSecondsLeft,
    formKey,
    submitCode,
    resendCode,
    clearError,
  }
}
