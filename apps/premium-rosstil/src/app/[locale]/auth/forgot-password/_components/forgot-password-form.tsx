'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { PremiumRosstilForm } from '@/premium-rosstil-form'
import { Alert, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { requestPasswordReset, type RequestPasswordResetResult } from '../_actions/request-password-reset'
import { type ForgotPasswordData, ForgotPasswordSchema } from '../_schemas/forgot-password.schema'

/**
 * Форма запроса восстановления пароля.
 * Использует PremiumRosstilForm (декларативный API) и Zod v4.
 */
export function ForgotPasswordForm() {
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSubmit = async (data: ForgotPasswordData) => {
    const result: RequestPasswordResetResult = await requestPasswordReset(data)

    if (result.success) {
      setShowSuccess(true)
    } else {
      toaster.error({
        title: 'Ошибка',
        description: result.error,
      })
    }
  }

  if (showSuccess) {
    return (
      <Alert.Root status="success">
        <Alert.Title>Письмо отправлено</Alert.Title>
        <Alert.Description>
          Если указанный email существует в нашей системе, мы отправили на него письмо с инструкциями по восстановлению
          пароля. Проверьте почту (включая папку "Спам").
        </Alert.Description>
      </Alert.Root>
    )
  }

  return (
    <PremiumRosstilForm
      initialValue={{
        email: '',
      }}
      schema={ForgotPasswordSchema}
      onSubmit={handleSubmit}
    >
      <VStack align="stretch" gap={4}>
        <PremiumRosstilForm.Errors />

        <PremiumRosstilForm.Field.String
          name="email"
          label="Email"
          type="email"
          placeholder="Введите ваш email"
          helperText="Мы отправим инструкции по восстановлению пароля на этот адрес"
          required
        />

        <PremiumRosstilForm.Button.Submit colorPalette="fg" size="lg" width="full">
          Отправить инструкции
        </PremiumRosstilForm.Button.Submit>
      </VStack>
    </PremiumRosstilForm>
  )
}
