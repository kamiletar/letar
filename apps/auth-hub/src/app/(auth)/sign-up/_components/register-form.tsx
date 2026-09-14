'use client'

import { registerUser } from '@/app/(auth)/_actions/register.action'
import { type RegisterData, RegisterSchema } from '@/app/(auth)/_schemas/register.schema'
import { AuthHubForm } from '@/auth-hub-form'
import { Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { usePostSignInCallback } from '../../_hooks/use-post-sign-in-callback'
import { VerifyEmailCode } from './verify-email-code'

/**
 * Форма регистрации
 */
export function RegisterForm() {
  // Поддерживает OIDC flow — так же, как на /sign-in
  const callbackUrl = usePostSignInCallback()

  const [error, setError] = useState<string | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)

  async function handleSubmit(data: RegisterData) {
    setError(null)

    const result = await registerUser(data)

    if (result.success) {
      setRegisteredEmail(result.email!)
    } else {
      setError(result.error ?? 'Ошибка регистрации')
    }
  }

  if (registeredEmail) {
    return <VerifyEmailCode email={registeredEmail} callbackUrl={callbackUrl} />
  }

  return (
    <AuthHubForm
      schema={RegisterSchema}
      initialValue={{ email: '', password: '', name: '', acceptPrivacy: false }}
      onSubmit={handleSubmit}
    >
      <Stack gap={4}>
        <AuthHubForm.Field.String name="name" label="Имя" autoComplete="name" placeholder="Ваше имя" />

        <AuthHubForm.Field.String
          name="email"
          label="Email"
          autoComplete="email"
          placeholder="you@example.com"
        />

        <AuthHubForm.Field.Password
          name="password"
          label="Пароль"
          autoComplete="new-password"
          placeholder="Минимум 8 символов"
          helperText="Строчная, заглавная буква и цифра"
        />

        <AuthHubForm.Field.Checkbox name="acceptPrivacy" label="Принимаю политику конфиденциальности" />

        {error && (
          <Text color="fg.error" fontSize="sm">
            {error}
          </Text>
        )}

        <AuthHubForm.Button.Submit colorPalette="brand" width="full">
          Зарегистрироваться
        </AuthHubForm.Button.Submit>
      </Stack>
    </AuthHubForm>
  )
}
