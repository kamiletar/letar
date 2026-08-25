'use client'

import { loginUser } from '@/app/(auth)/_actions/login.action'
import { type LoginData, LoginSchema } from '@/app/(auth)/_schemas/login.schema'
import { AuthHubForm } from '@/auth-hub-form'
import { authClient } from '@/lib/auth-client'
import { Stack, Text } from '@chakra-ui/react'
import { ResendVerificationButton } from '@letar/auth/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { usePostSignInCallback } from '../../_hooks/use-post-sign-in-callback'
import { usePasskeyConditionalAuth } from '../_hooks/use-passkey-conditional-auth'

/**
 * Форма входа по email/password
 * Автоматически создаёт аккаунт, если пользователь не найден
 */
export function LoginForm() {
  const router = useRouter()
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

    const result = await loginUser({ ...data, callbackUrl })

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
    <AuthHubForm schema={LoginSchema} initialValue={{ email: '', password: '' }} onSubmit={handleSubmit}>
      <Stack gap={4}>
        <AuthHubForm.Field.String
          name="email"
          label="Email"
          autoComplete="username webauthn"
          placeholder="you@example.com"
        />

        <AuthHubForm.Field.Password
          name="password"
          label="Пароль"
          autoComplete="current-password"
          placeholder="••••••••"
        />

        {error && (
          <Text color="fg.error" fontSize="sm">
            {error}
          </Text>
        )}

        {info && (
          <Text color="fg.info" fontSize="sm">
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

        <AuthHubForm.Button.Submit colorPalette="brand" width="full">
          Войти
        </AuthHubForm.Button.Submit>

        <Text fontSize="xs" color="fg.subtle" textAlign="center">
          Если аккаунта с таким email ещё нет — он будет создан автоматически
        </Text>
      </Stack>
    </AuthHubForm>
  )
}
