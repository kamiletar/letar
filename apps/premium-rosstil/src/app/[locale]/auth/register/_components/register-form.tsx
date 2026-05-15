'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Alert, Link, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useState } from 'react'
import { type RegisterFormData, RegisterSchema } from '../../_schemas/email-auth.schema'

export function RegisterForm() {
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (data: RegisterFormData) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      toaster.error({
        title: 'Ошибка регистрации',
        description: result.error || 'Не удалось выполнить регистрацию',
      })
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <Alert.Root status="success">
        <Alert.Title>Регистрация успешна!</Alert.Title>
        <Alert.Description>
          Проверьте ваш email для подтверждения адреса. После подтверждения вы сможете войти в систему.
        </Alert.Description>
      </Alert.Root>
    )
  }

  return (
    <PremiumRosstilForm
      initialValue={{ name: '', email: '', password: '', confirmPassword: '', consent: false as unknown as true }}
      schema={RegisterSchema}
      onSubmit={handleSubmit}
    >
      <VStack align="stretch" gap={4}>
        <PremiumRosstilForm.Errors />

        <PremiumRosstilForm.Field.String name="name" label="Имя" placeholder="Ваше имя" required />

        <PremiumRosstilForm.Field.String
          name="email"
          label="Email"
          type="email"
          placeholder="your@email.com"
          required
        />

        <PremiumRosstilForm.Field.PasswordStrength
          name="password"
          label="Пароль"
          placeholder="Минимум 8 символов"
          helperText="Пароль должен содержать минимум 8 символов, заглавные и строчные буквы, цифры"
          required
        />

        <PremiumRosstilForm.Field.Password
          name="confirmPassword"
          label="Подтвердите пароль"
          placeholder="Повторите пароль"
          required
        />

        <PremiumRosstilForm.Field.Checkbox
          name="consent"
          label={
            <Text as="span" fontSize="sm">
              Я принимаю{' '}
              <Link asChild variant="underline">
                <NextLink href="/legal/terms">Пользовательское соглашение</NextLink>
              </Link>{' '}
              и даю согласие на обработку{' '}
              <Link asChild variant="underline">
                <NextLink href="/legal/privacy">персональных данных</NextLink>
              </Link>
            </Text>
          }
          colorPalette="fg"
        />

        <PremiumRosstilForm.Button.Submit colorPalette="fg">Зарегистрироваться</PremiumRosstilForm.Button.Submit>
      </VStack>
    </PremiumRosstilForm>
  )
}
