'use client'

import { Button, Spinner, Stack, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import type { UseEmailCodeVerificationResult } from './use-email-code-verification'

export interface EmailCodePanelTexts {
  title: string
  hint: string
  resend: string
  resendIn: (secondsLeft: number) => string
  verified: string
}

const DEFAULT_TEXTS: EmailCodePanelTexts = {
  title: 'Код подтверждения',
  hint: 'Или перейдите по ссылке в письме',
  resend: 'Отправить повторно',
  resendIn: (s) => `Отправить повторно через ${s} с`,
  verified: 'Подтверждено',
}

export interface EmailCodePanelProps {
  email: string
  state: UseEmailCodeVerificationResult
  /** Форма поля кода — рендерит приложение своим инстансом `createForm` (либа не знает про формы приложений). */
  renderCodeForm: (props: { formKey: number; disabled: boolean; onComplete: (code: string) => void }) => ReactNode
  /** Что показать, когда подтверждено в другой вкладке/устройстве — приложение решает сам экран. */
  elsewhere: ReactNode
  texts?: Partial<EmailCodePanelTexts>
}

/**
 * Карточка ввода кода из письма (PLAN_EMAIL_CODE.md §0.5) — обычная замена содержимого,
 * без полноэкранного оверлея.
 */
export function EmailCodePanel(props: EmailCodePanelProps) {
  const { email, state, renderCodeForm, elsewhere, texts: textsOverride } = props
  const texts = { ...DEFAULT_TEXTS, ...textsOverride }

  if (state.status === 'verifiedElsewhere') {
    return elsewhere
  }

  if (state.status === 'verified') {
    return (
      <Stack gap={3} align="center" py={6}>
        <Spinner />
        <Text fontWeight="medium">{texts.verified}</Text>
      </Stack>
    )
  }

  return (
    <Stack gap={4}>
      <Stack gap={1}>
        <Text fontWeight="medium">{texts.title}</Text>
        <Text fontSize="sm" color="fg.muted">
          {email}
        </Text>
      </Stack>

      {renderCodeForm({
        formKey: state.formKey,
        disabled: state.isVerifying,
        onComplete: state.submitCode,
      })}

      {state.error && (
        <Text role="alert" fontSize="sm" color="fg.error">
          {state.error}
        </Text>
      )}

      <Stack gap={1} align="start">
        {state.canResend
          ? (
            <Button
              variant="ghost"
              size="sm"
              loading={state.isResending}
              onClick={state.resendCode}
            >
              {texts.resend}
            </Button>
          )
          : (
            <Text fontSize="sm" color="fg.muted">
              {texts.resendIn(state.resendSecondsLeft)}
            </Text>
          )}
        <Text fontSize="xs" color="fg.muted">
          {texts.hint}
        </Text>
      </Stack>
    </Stack>
  )
}
