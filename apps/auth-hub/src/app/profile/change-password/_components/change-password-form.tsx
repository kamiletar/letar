'use client'

import { Button, Field, Input, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { setPasswordAction, type SetPasswordResult } from '../_actions/set-password.action'

interface ChangePasswordFormProps {
  hasCurrentPassword: boolean
}

/**
 * Форма смены/установки пароля
 */
export function ChangePasswordForm({ hasCurrentPassword }: ChangePasswordFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const newPassword = formData.get('newPassword') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (newPassword !== confirmPassword) {
      setError('Пароли не совпадают')
      setLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setError('Минимум 8 символов')
      setLoading(false)
      return
    }

    try {
      if (hasCurrentPassword) {
        // Смена существующего пароля через Better Auth API
        const currentPassword = formData.get('currentPassword') as string
        const response = await fetch('/api/auth/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentPassword, newPassword }),
        })

        if (response.ok) {
          setSuccess(true)
        } else {
          const data = await response.json()
          setError(data.message || 'Ошибка смены пароля')
        }
      } else {
        // Установка пароля для OAuth-пользователя через server action
        const result: SetPasswordResult = await setPasswordAction(formData)
        if (result.success) {
          setSuccess(true)
        } else {
          setError(result.error || 'Ошибка установки пароля')
        }
      }
    } catch {
      setError('Ошибка сети')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Stack gap={4}>
        <Text color="fg.success" fontWeight="bold">
          Пароль успешно {hasCurrentPassword ? 'изменён' : 'установлен'}!
        </Text>
        <Button variant="outline" asChild w="full">
          <a href="/profile">Вернуться в профиль</a>
        </Button>
      </Stack>
    )
  }

  return (
    <form method="post" onSubmit={handleSubmit}>
      <Stack gap={4}>
        {hasCurrentPassword && (
          <Field.Root>
            <Field.Label>Текущий пароль</Field.Label>
            <Input name="currentPassword" type="password" autoComplete="current-password" required />
          </Field.Root>
        )}

        <Field.Root>
          <Field.Label>Новый пароль</Field.Label>
          <Input name="newPassword" type="password" autoComplete="new-password" required />
          <Field.HelperText>Минимум 8 символов</Field.HelperText>
        </Field.Root>

        <Field.Root>
          <Field.Label>Повторите пароль</Field.Label>
          <Input name="confirmPassword" type="password" autoComplete="new-password" required />
        </Field.Root>

        {error && (
          <Text color="fg.error" fontSize="sm">
            {error}
          </Text>
        )}

        <Button type="submit" colorPalette="brand" loading={loading} w="full">
          {hasCurrentPassword ? 'Изменить пароль' : 'Установить пароль'}
        </Button>
      </Stack>
    </form>
  )
}
