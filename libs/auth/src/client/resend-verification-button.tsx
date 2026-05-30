'use client'

import { Button, type ButtonProps } from '@chakra-ui/react'
import { type JSX, useCallback, useEffect, useState } from 'react'

/**
 * Минимальный структурный контракт auth-клиента для повторной отправки письма.
 * Покрывает форму ответа Better Auth (`{ error }`), не завязываясь на полный тип клиента.
 */
export interface ResendCapableAuthClient {
  sendVerificationEmail: (params: {
    email: string
    callbackURL?: string
  }) => Promise<{ error?: { message?: string } | null } | undefined | null>
}

export interface ResendVerificationButtonProps extends Omit<ButtonProps, 'onClick' | 'children' | 'onError'> {
  /** Auth-клиент Better Auth (передаётся приложением — aboi/kami строят его из better-auth/react) */
  authClient: ResendCapableAuthClient
  /** Email, на который повторно отправляется письмо верификации */
  email: string
  /** URL редиректа после успешной верификации */
  callbackURL?: string
  /** Длительность cooldown в секундах (по умолчанию 60) */
  cooldownSeconds?: number
  /** Текст кнопки в состоянии готовности (по умолчанию «Отправить письмо повторно») */
  idleLabel?: string
  /** Формат текста обратного отсчёта (по умолчанию «Отправить повторно через {n} с») */
  countdownLabel?: (secondsLeft: number) => string
  /** Вызывается после успешной отправки */
  onSent?: () => void
  /**
   * Вызывается при ошибке отправки. Сообщение — нейтральное, без деталей SMTP (§13.4),
   * чтобы не раскрывать существование пользователя и внутренние ошибки.
   */
  onError?: (message: string) => void
}

const NEUTRAL_ERROR = 'Не удалось отправить письмо. Попробуйте ещё раз.'

/**
 * Кнопка повторной отправки письма email-верификации.
 *
 * Тонкая обёртка над `authClient.sendVerificationEmail` со встроенным cooldown.
 * Cooldown запускается ТОЛЬКО при успешной отправке (§13.4): если письмо не ушло
 * (`error`), кнопка остаётся доступной, а пользователь видит нейтральное сообщение.
 *
 * @example
 * ```tsx
 * import { ResendVerificationButton } from '@letar/auth/client'
 * import { authClient } from '@/lib/auth-client'
 *
 * <ResendVerificationButton
 *   authClient={authClient}
 *   email={email}
 *   callbackURL="/dashboard"
 *   onError={(msg) => toaster.error({ title: msg })}
 * />
 * ```
 */
export function ResendVerificationButton({
  authClient,
  email,
  callbackURL,
  cooldownSeconds = 60,
  idleLabel = 'Отправить письмо повторно',
  countdownLabel = (secondsLeft) => `Отправить повторно через ${secondsLeft} с`,
  onSent,
  onError,
  ...buttonProps
}: ResendVerificationButtonProps): JSX.Element {
  // Стартуем с 0 → кнопка сразу доступна; cooldown заводим вручную при успехе
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const canResend = secondsLeft <= 0

  // Обратный отсчёт cooldown
  useEffect(() => {
    if (secondsLeft <= 0) {
      return
    }
    const timer = setTimeout(() => setSecondsLeft((prev) => prev - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  const handleClick = useCallback(async () => {
    setIsSending(true)
    try {
      const result = await authClient.sendVerificationEmail({ email, callbackURL })

      if (result?.error) {
        // §13.4 — НЕ запускаем cooldown при ошибке, кнопка остаётся доступной
        onError?.(NEUTRAL_ERROR)
        return
      }

      setSecondsLeft(cooldownSeconds)
      onSent?.()
    } catch {
      onError?.(NEUTRAL_ERROR)
    } finally {
      setIsSending(false)
    }
  }, [authClient, email, callbackURL, cooldownSeconds, onSent, onError])

  return (
    <Button type="button" onClick={handleClick} disabled={!canResend || isSending} loading={isSending} {...buttonProps}>
      {canResend ? idleLabel : countdownLabel(secondsLeft)}
    </Button>
  )
}
