'use client'

import { loginUser } from '@/app/(auth)/_actions/login.action'
import { type LoginData, LoginSchema } from '@/app/(auth)/_schemas/login.schema'
import { authClient } from '@/lib/auth-client'
import { Button, Field, Group, IconButton, Input, InputAddon, Stack, Text } from '@chakra-ui/react'
import { ResendVerificationButton } from '@letar/auth/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuEye, LuEyeOff } from 'react-icons/lu'
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
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  // Email, для которого нужна повторная отправка письма верификации (Этап 2 PLAN.md)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  // Запускаем Conditional UI — passkeys появляются в дропдауне поля email
  usePasskeyConditionalAuth(callbackUrl)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setPendingEmail(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data: LoginData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    const parsed = LoginSchema.safeParse(data)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ошибка валидации')
      setLoading(false)
      return
    }

    const result = await loginUser({ ...parsed.data, callbackUrl })

    if (result.success) {
      router.push(result.redirectTo || '/')
      router.refresh()
    } else if (result.verifyEmailSent) {
      // Аккаунт создан/не верифицирован — показываем info + кнопку resend
      setInfo(result.error ?? 'Письмо подтверждения отправлено')
      setPendingEmail(parsed.data.email)
      setLoading(false)
    } else {
      setError(result.error ?? 'Ошибка входа')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={4}>
        <Field.Root>
          <Field.Label>Email</Field.Label>
          <Input
            name="email"
            type="email"
            autoComplete="username webauthn"
            placeholder="you@example.com"
            required
          />
        </Field.Root>

        <Field.Root>
          <Field.Label>Пароль</Field.Label>
          <Group attached w="full">
            <Input
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              required
              flex={1}
            />
            <InputAddon p={0}>
              <IconButton
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                variant="ghost"
                size="sm"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <LuEyeOff /> : <LuEye />}
              </IconButton>
            </InputAddon>
          </Group>
        </Field.Root>

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

        <Button type="submit" colorPalette="brand" loading={loading} w="full">
          Войти
        </Button>

        <Text fontSize="xs" color="fg.subtle" textAlign="center">
          Если аккаунта с таким email ещё нет — он будет создан автоматически
        </Text>
      </Stack>
    </form>
  )
}
