'use client'

import { loginUser } from '@/app/(auth)/_actions/login.action'
import { type LoginData, LoginSchema } from '@/app/(auth)/_schemas/login.schema'
import { AuthHubForm } from '@/auth-hub-form'
import { authClient } from '@/lib/auth-client'
import { Box, Stack, Text } from '@chakra-ui/react'
import { ResendVerificationButton } from '@letar/auth/client'
import NextLink from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { usePostSignInCallback } from '../../_hooks/use-post-sign-in-callback'
import { usePasskeyConditionalAuth } from '../_hooks/use-passkey-conditional-auth'

/**
 * Форма входа по email/password
 * Новый аккаунт создаётся через подтверждение почты по ссылке, не по ошибке пароля.
 */
export function LoginForm(
  { initialEmail = '', onEmailChange }: { initialEmail?: string; onEmailChange?: (email: string) => void },
) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.toString()
  const forgotPasswordHref = query ? `/forgot-password?${query}` : '/forgot-password'
  // Поддерживает OIDC flow — возвращает /oauth2/authorize?<query> если страница
  // открыта с OIDC параметрами, иначе обычный callbackUrl из query
  const callbackUrl = usePostSignInCallback()

  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  // Email, для которого нужна повторная отправка письма верификации (Этап 2 PLAN.md)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  // Запускаем Conditional UI — passkeys появляются в дропдауне поля email
  usePasskeyConditionalAuth(callbackUrl)

  async function handleSubmit(data: LoginData) {
    setError(null)
    setInfo(null)
    setPendingEmail(null)

    let result: Awaited<ReturnType<typeof loginUser>>
    try {
      result = await loginUser({ ...data, callbackUrl })
    } catch {
      setError('Не удалось связаться с сервером. Проверьте соединение и попробуйте ещё раз.')
      return
    }

    if (result.success) {
      router.push(result.redirectTo || '/')
      router.refresh()
    } else if (result.verifyEmailSent) {
      // Аккаунт создан/не верифицирован — показываем info + кнопку resend
      setInfo(result.error ?? 'Письмо подтверждения отправлено')
      setPendingEmail(data.email)
    } else {
      setError(result.error ?? 'Ошибка входа')
    }
  }

  return (
    <AuthHubForm schema={LoginSchema} initialValue={{ email: initialEmail, password: '' }} onSubmit={handleSubmit}>
      <Stack gap={4}>
        <AuthHubForm.Watch field="email" onChange={(value) => onEmailChange?.(String(value ?? ''))} />
        <AuthHubForm.Field.String
          name="email"
          label="Почта"
          type="email"
          inputMode="email"
          autoComplete="username webauthn"
          placeholder="you@example.com"
        />

        <AuthHubForm.Field.Password
          name="password"
          label="Пароль"
          autoComplete="current-password"
          placeholder="••••••••"
          helperText=""
        />

        <Box asChild alignSelf="flex-end" fontSize="sm" color="colorPalette.fg" fontWeight="medium">
          <NextLink href={forgotPasswordHref}>Забыли пароль?</NextLink>
        </Box>

        {error && (
          <Text role="alert" color="fg.error" fontSize="sm">
            {error}
          </Text>
        )}

        {info && (
          <Text role="status" color="fg.info" fontSize="sm">
            {info}
          </Text>
        )}

        {pendingEmail && (
          <ResendVerificationButton
            authClient={authClient}
            email={pendingEmail}
            callbackURL={callbackUrl}
            variant="outline"
            size="sm"
            w="full"
            onSent={() => setInfo('Письмо отправлено повторно. Проверьте почту.')}
            onError={(message) => setError(message)}
          />
        )}

        <AuthHubForm.Button.Submit colorPalette="brand" width="full" size="lg">
          Войти
        </AuthHubForm.Button.Submit>

        <Text fontSize="sm" color="fg.muted">
          Ещё не задавали пароль? Выберите «По ссылке» — пароль не понадобится.
        </Text>
      </Stack>
    </AuthHubForm>
  )
}
