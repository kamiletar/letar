'use client'

import { requestPasswordReset, resetPasswordWithCode } from '@/app/(auth)/_actions/forgot-password.action'
import {
  type ForgotPasswordRequestData,
  ForgotPasswordRequestSchema,
  type ResetPasswordData,
  ResetPasswordSchema,
} from '@/app/(auth)/_schemas/forgot-password.schema'
import { AuthHubForm } from '@/auth-hub-form'
import { Box, Heading, Stack, Text } from '@chakra-ui/react'
import { useResendCountdown } from '@letar/pin-auth/client'
import NextLink from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

type Step = 'email' | 'code' | 'done'

/**
 * Сброс пароля кодом из письма (PLAN_EMAIL_CODE.md, R3/A.4) — без ссылки в письме сброса.
 *
 * Шаг 1 всегда отвечает нейтральным текстом независимо от того, существует ли аккаунт —
 * `requestPasswordReset` (server action) не выдаёт наличие email, как и сам better-auth.
 */
export function ForgotPasswordFlow() {
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const signInHref = query ? `/sign-in?${query}` : '/sign-in'

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [formKey, setFormKey] = useState(0)

  const resend = useResendCountdown({ initialSeconds: 60 })

  async function handleRequestReset(data: ForgotPasswordRequestData) {
    await requestPasswordReset(data.email)
    setEmail(data.email)
    setStep('code')
    resend.start()
  }

  async function handleResend() {
    if (!resend.canResend) {
      return
    }
    await requestPasswordReset(email)
    resend.reset()
    setFormKey((k) => k + 1)
  }

  async function handleResetPassword(data: ResetPasswordData) {
    setError(null)
    const result = await resetPasswordWithCode({ email, otp: data.pin, password: data.password })

    if (result.success) {
      setStep('done')
    } else {
      setError(result.error ?? 'Не удалось сбросить пароль')
    }
  }

  if (step === 'done') {
    return (
      <Stack gap={4} align="center" textAlign="center">
        <Heading size="md">Пароль изменён</Heading>
        <Text color="fg.muted">Теперь вы можете войти с новым паролем.</Text>
        <Box asChild color="colorPalette.fg" fontWeight="medium">
          <NextLink href={signInHref}>Войти</NextLink>
        </Box>
      </Stack>
    )
  }

  if (step === 'code') {
    return (
      <Stack gap={4}>
        <Heading size="md">Введите код</Heading>
        <Text color="fg.muted" fontSize="sm">
          Если адрес {email} зарегистрирован, мы отправили на него 6-значный код.
        </Text>

        <AuthHubForm
          key={formKey}
          schema={ResetPasswordSchema}
          initialValue={{ pin: '', password: '', confirmPassword: '' }}
          onSubmit={handleResetPassword}
        >
          <Stack gap={4}>
            <AuthHubForm.Field.Auto name="pin" />
            <AuthHubForm.Field.Password
              name="password"
              label="Новый пароль"
              autoComplete="new-password"
              placeholder="Минимум 8 символов"
              helperText="Строчная, заглавная буква и цифра"
            />
            <AuthHubForm.Field.Password
              name="confirmPassword"
              label="Повторите пароль"
              autoComplete="new-password"
            />

            {error && (
              <Text color="fg.error" fontSize="sm" role="alert">
                {error}
              </Text>
            )}

            <AuthHubForm.Button.Submit colorPalette="brand" width="full">
              Сменить пароль
            </AuthHubForm.Button.Submit>

            <Box textAlign="center" fontSize="sm">
              {resend.canResend
                ? (
                  <Box asChild color="colorPalette.fg" fontWeight="medium" onClick={handleResend} cursor="pointer">
                    <button type="button">Отправить код повторно</button>
                  </Box>
                )
                : <Text color="fg.subtle">Отправить код повторно через {resend.secondsLeft} с</Text>}
            </Box>
          </Stack>
        </AuthHubForm>
      </Stack>
    )
  }

  return (
    <Stack gap={4}>
      <Heading size="md">Забыли пароль?</Heading>
      <Text color="fg.muted" fontSize="sm">
        Укажите email — мы отправим код для сброса пароля.
      </Text>

      <AuthHubForm schema={ForgotPasswordRequestSchema} initialValue={{ email: '' }} onSubmit={handleRequestReset}>
        <Stack gap={4}>
          <AuthHubForm.Field.String name="email" label="Email" autoComplete="email" placeholder="you@example.com" />
          <AuthHubForm.Button.Submit colorPalette="brand" width="full">
            Отправить код
          </AuthHubForm.Button.Submit>
        </Stack>
      </AuthHubForm>

      <Text fontSize="sm" color="fg.muted" textAlign="center">
        Вспомнили пароль?{' '}
        <Box asChild color="colorPalette.fg" fontWeight="medium">
          <NextLink href={signInHref}>Войти</NextLink>
        </Box>
      </Text>
    </Stack>
  )
}
