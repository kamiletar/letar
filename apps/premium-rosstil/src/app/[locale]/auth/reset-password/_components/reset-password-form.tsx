'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { VStack } from '@chakra-ui/react'
import { resetPassword, type ResetPasswordResult } from '../_actions/reset-password'
import { type ResetPasswordData, ResetPasswordSchema } from '../_schemas/reset-password.schema'

interface ResetPasswordFormProps {
  token: string
}

/**
 * Форма сброса пароля по токену.
 * Использует PremiumRosstilForm (декларативный API) и Zod v4.
 */
export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter()

  const handleSubmit = async (data: ResetPasswordData) => {
    const result: ResetPasswordResult = await resetPassword(data)

    if (result.success) {
      toaster.success({
        title: 'Пароль сброшен',
        description: 'Теперь вы можете войти с новым паролем',
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
        token,
        password: '',
        confirmPassword: '',
      }}
      schema={ResetPasswordSchema}
      onSubmit={handleSubmit}
    >
      <VStack align="stretch" gap={4}>
        <PremiumRosstilForm.Errors />

        {/* Скрытое поле с токеном */}
        <PremiumRosstilForm.Field.Hidden name="token" />

        <PremiumRosstilForm.Field.PasswordStrength
          name="password"
          label="Новый пароль"
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
          Сбросить пароль
        </PremiumRosstilForm.Button.Submit>
      </VStack>
    </PremiumRosstilForm>
  )
}
