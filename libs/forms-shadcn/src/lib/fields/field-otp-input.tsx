'use client'

import { useDeclarativeForm } from '@letar/forms-react'
import type { ReactElement } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { createField, FieldWrapper } from '../uikit/primitives'
import { shadcnUIKit } from '../uikit/uikit-shadcn'
import { cn } from '@letar/tailwind-utils'
import type { OTPInputFieldProps } from './types'

interface OTPFieldState {
  countdown: number
  isResending: boolean
  handleResend: () => Promise<void>
  formContext: ReturnType<typeof useDeclarativeForm>
}

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Form.Field.OTPInput — shadcn-скин.
 *
 * Переиспользует `shadcnUIKit.PinInput` (тот же примитив, что `FieldPinInput`) + таймер
 * повторной отправки поверх. Beta-упрощение: только числовой ввод (`inputMode="numeric"`
 * зашит в сам примитив `PinInput`) — `type="alphanumeric"` из Chakra-версии не поддержан,
 * контракт `UIKitPinInputProps` его не предусматривает.
 */
export const FieldOTPInput = createField<OTPInputFieldProps, string, OTPFieldState>({
  displayName: 'FieldOTPInput',

  useFieldState: (props): OTPFieldState => {
    const [countdown, setCountdown] = useState(0)
    const [isResending, setIsResending] = useState(false)

    useEffect(() => {
      if (countdown <= 0) { return }
      const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000)
      return () => clearInterval(timer)
    }, [countdown])

    const handleResend = useCallback(async () => {
      if (!props.onResend || countdown > 0) { return }
      setIsResending(true)
      try {
        await props.onResend()
        setCountdown(props.resendTimeout ?? 60)
      } finally {
        setIsResending(false)
      }
    }, [props.onResend, countdown, props.resendTimeout])

    const formContext = useDeclarativeForm()

    return { countdown, isResending, handleResend, formContext }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { length = 6, autoSubmit = false, mask = false, onResend } = componentProps
    const { countdown, isResending, handleResend, formContext } = fieldState

    const handleChange = (value: string) => {
      field.handleChange(value)
      if (autoSubmit && value.length === length) {
        formContext.form.handleSubmit()
      }
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <div>
          <shadcnUIKit.PinInput
            value={(field.state.value as string) ?? ''}
            onChange={handleChange}
            length={length}
            mask={mask}
            disabled={resolved.disabled}
            data-field-name={fullPath}
          />
          {onResend && (
            <div className="mt-3 flex justify-center">
              {countdown > 0
                ? <span className="text-muted-foreground text-sm">Повторно через {formatCountdown(countdown)}</span>
                : (
                  <button
                    type="button"
                    disabled={isResending}
                    onClick={handleResend}
                    className={cn('text-sm underline', isResending && 'pointer-events-none opacity-50')}
                  >
                    Отправить код повторно
                  </button>
                )}
            </div>
          )}
        </div>
      </FieldWrapper>
    )
  },
})
