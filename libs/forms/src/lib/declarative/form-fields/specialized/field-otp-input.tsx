'use client'

import { Box, Button, HStack, PinInput, Text } from '@chakra-ui/react'
import { type ReactElement, useCallback, useEffect, useState } from 'react'
import { useDeclarativeForm } from '../../form-context'
import type { DeclarativeFormContextValue, OTPInputFieldProps } from '../../types'
import { createField, FieldWrapper } from '../base'

/**
 * State for OTP field with timer
 */
interface OTPFieldState {
  /** Seconds counter until retry is available */
  countdown: number
  /** Whether resend is in progress */
  isResending: boolean
  /** Resend handler */
  handleResend: () => Promise<void>
  /** Formatted countdown (MM:SS) */
  formatCountdown: (seconds: number) => string
  /** Context declarative form for auto-submit */
  formContext: DeclarativeFormContextValue
}

/**
 * Form.Field.OTPInput - OTP input field with resend timer
 *
 * Renders a PIN input for OTP verification with optional resend functionality.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.OTPInput name="code" label="Confirmation Code" />
 * ```
 *
 * @example With resend
 * ```tsx
 * <Form.Field.OTPInput
 *   name="code"
 *   length={6}
 *   resendTimeout={60}
 *   onResend={async () => { await sendCode() }}
 *   autoSubmit
 * />
 * ```
 *
 * @example Alphanumeric input
 * ```tsx
 * <Form.Field.OTPInput name="code" type="alphanumeric" />
 * ```
 */
export const FieldOTPInput = createField<OTPInputFieldProps, string, OTPFieldState>({
  displayName: 'FieldOTPInput',

  useFieldState: (props) => {
    const [countdown, setCountdown] = useState(0)
    const [isResending, setIsResending] = useState(false)

    // Countdown timer effect
    useEffect(() => {
      if (countdown <= 0) {
        return
      }

      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1)
      }, 1000)

      return () => clearInterval(timer)
    }, [countdown])

    const handleResend = useCallback(async () => {
      if (!props.onResend || countdown > 0) {
        return
      }

      setIsResending(true)
      try {
        await props.onResend()
        setCountdown(props.resendTimeout ?? 60)
      } finally {
        setIsResending(false)
      }
    }, [props.onResend, countdown, props.resendTimeout])

    // Format countdown as MM:SS
    const formatCountdown = (seconds: number): string => {
      const mins = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Form context for auto-submit (hook called at top level)
    const formContext = useDeclarativeForm()

    return { countdown, isResending, handleResend, formatCountdown, formContext }
  },

  render: ({ field, fullPath, resolved, hasError, errorMessage, componentProps, fieldState }): ReactElement => {
    const { length = 6, autoSubmit = false, type = 'numeric', mask = false, onResend } = componentProps
    const { countdown, isResending, handleResend, formatCountdown, formContext } = fieldState

    const value = (field.state.value as string) ?? ''

    const handleValueComplete = (details: { value: string[]; valueAsString: string }) => {
      field.handleChange(details.valueAsString)

      // Auto-submit when filled
      if (autoSubmit && details.valueAsString.length === length) {
        formContext.form.handleSubmit()
      }
    }

    return (
      <FieldWrapper resolved={resolved} hasError={hasError} errorMessage={errorMessage} fullPath={fullPath}>
        <Box>
          <PinInput.Root
            value={value.split('')}
            onValueComplete={handleValueComplete}
            onValueChange={(details) => field.handleChange(details.valueAsString)}
            count={length}
            type={type}
            mask={mask}
            otp
          >
            <PinInput.Control>
              <HStack gap={2}>
                {Array.from({ length }).map((_, index) => (
                  <PinInput.Input key={index} index={index} data-field-name={index === 0 ? fullPath : undefined} />
                ))}
              </HStack>
            </PinInput.Control>
            <PinInput.HiddenInput />
          </PinInput.Root>

          {onResend && (
            <HStack mt={3} justify="center">
              {countdown > 0 ? (
                <Text fontSize="sm" color="fg.muted">
                  Redo in {formatCountdown(countdown)}
                </Text>
              ) : (
                <Button variant="ghost" size="sm" onClick={handleResend} disabled={isResending} loading={isResending}>
                  Submit again
                </Button>
              )}
            </HStack>
          )}
        </Box>
      </FieldWrapper>
    )
  },
})
