'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Alert, VStack } from '@chakra-ui/react'
import { changePassword, type ChangePasswordResult } from '../_actions/change-password'
import { type ChangePasswordData, ChangePasswordSchema } from '../_schemas/change-password.schema'

interface ChangePasswordFormProps {
  hasPassword: boolean // Есть ли у пользователя текущий пароль
}

/**
 * Форма смены пароля.
 * Использует PremiumRosstilForm и Zod v4.
 */
export function ChangePasswordForm({ hasPassword }: ChangePasswordFormProps) {
  const router = useRouter()

  const handleSubmit = async (data: ChangePasswordData) => {
    const result: ChangePasswordResult = await changePassword(data)

    if (result.success) {
      toaster.success({
        title: hasPassword ? 'Пароль изменён' : 'Пароль установлен',
        description: 'Ваш пароль успешно обновлён',
      })
      router.push(result.redirect)
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    }
  }

  return (
    <PremiumRosstilForm
      initialValue={{
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }}
      schema={ChangePasswordSchema}
      onSubmit={handleSubmit}
    >
      <VStack align="stretch" gap={4}>
        <PremiumRosstilForm.Errors />

        {!hasPassword && (
          <Alert.Root status="info">
            <Alert.Title>У вас еще нет пароля. Установите пароль для возможности входа через email.</Alert.Title>
          </Alert.Root>
        )}

        {hasPassword && (
          <PremiumRosstilForm.Field.Password
            name="currentPassword"
            label="Текущий пароль"
            placeholder="Введите текущий пароль"
            required
          />
        )}

        <PremiumRosstilForm.Field.PasswordStrength
          name="newPassword"
          label={hasPassword ? 'Новый пароль' : 'Пароль'}
          placeholder="Минимум 8 символов, буквы и цифры"
          helperText="Минимум 8 символов, должен содержать заглавные и строчные буквы, цифры"
          required
        />

        <PremiumRosstilForm.Field.Password
          name="confirmPassword"
          label="Подтвердите пароль"
          placeholder="Повторите новый пароль"
          required
        />

        <PremiumRosstilForm.Button.Submit colorPalette="fg" size="lg" width="full">
          {hasPassword ? 'Изменить пароль' : 'Установить пароль'}
        </PremiumRosstilForm.Button.Submit>
      </VStack>
    </PremiumRosstilForm>
  )
}
