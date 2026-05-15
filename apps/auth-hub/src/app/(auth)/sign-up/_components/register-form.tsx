'use client'

import { registerUser } from '@/app/(auth)/_actions/register.action'
import { type RegisterData, RegisterSchema } from '@/app/(auth)/_schemas/register.schema'
import { Button, Checkbox, Field, Input, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'

/**
 * Форма регистрации
 */
export function RegisterForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const data: RegisterData = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      name: (formData.get('name') as string) || undefined,
      acceptPrivacy: formData.get('acceptPrivacy') === 'on',
    }

    const parsed = RegisterSchema.safeParse(data)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ошибка валидации')
      setLoading(false)
      return
    }

    const result = await registerUser(parsed.data)

    if (result.success) {
      setSuccess(result.email!)
    } else {
      setError(result.error ?? 'Ошибка регистрации')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Stack gap={3} textAlign="center" p={4}>
        <Text fontWeight="bold" fontSize="lg">
          Проверьте почту
        </Text>
        <Text color="fg.muted">Мы отправили письмо для подтверждения на {success}</Text>
      </Stack>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Stack gap={4}>
        <Field.Root>
          <Field.Label>Имя</Field.Label>
          <Input name="name" autoComplete="name" placeholder="Ваше имя" />
        </Field.Root>

        <Field.Root>
          <Field.Label>Email</Field.Label>
          <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        </Field.Root>

        <Field.Root>
          <Field.Label>Пароль</Field.Label>
          <Input
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Минимум 8 символов"
            required
          />
          <Field.HelperText>Строчная, заглавная буква и цифра</Field.HelperText>
        </Field.Root>

        <Checkbox.Root name="acceptPrivacy">
          <Checkbox.HiddenInput />
          <Checkbox.Control />
          <Checkbox.Label fontSize="sm">Принимаю политику конфиденциальности</Checkbox.Label>
        </Checkbox.Root>

        {error && (
          <Text color="fg.error" fontSize="sm">
            {error}
          </Text>
        )}

        <Button type="submit" colorPalette="brand" loading={loading} w="full">
          Зарегистрироваться
        </Button>
      </Stack>
    </form>
  )
}
