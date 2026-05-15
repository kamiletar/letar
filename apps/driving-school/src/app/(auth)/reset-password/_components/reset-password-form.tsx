'use client'

import { resetPassword } from '@/app/(auth)/_actions/reset-password.action'
import { type ResetPasswordFormData, ResetPasswordSchema } from '@/app/(auth)/_schemas/reset-password.schema'
import { DrivingSchoolForm } from '@/driving-school-form'
import { Box, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface ResetPasswordFormProps {
  token: string
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (data: ResetPasswordFormData) => {
    setFormError(null)

    const result = await resetPassword(data)

    if (result.success) {
      router.push('/sign-in?message=password_reset_success')
      return
    }

    // Преобразуем коды ошибок в понятные сообщения
    switch (result.error) {
      case 'TOKEN_INVALID':
        setFormError('Недействительная ссылка для сброса пароля')
        break
      case 'TOKEN_EXPIRED':
        setFormError('Ссылка для сброса пароля истекла. Запросите новую.')
        break
      case 'USER_NOT_FOUND':
        setFormError('Пользователь не найден')
        break
      default:
        setFormError('Произошла ошибка. Попробуйте позже.')
    }
  }

  return (
    <DrivingSchoolForm
      initialValue={{
        token,
        password: '',
        confirmPassword: '',
      }}
      schema={ResetPasswordSchema}
      onSubmit={handleSubmit}
    >
      <VStack gap={4} align="stretch">
        {formError && (
          <Box layerStyle="panel.error">
            <Text color="error.fg" fontSize="sm">
              {formError}
            </Text>
          </Box>
        )}

        {/* Всё автоматически из схемы: label, placeholder, fieldType */}
        <DrivingSchoolForm.Field.Auto name="password" showRequirements />
        <DrivingSchoolForm.Field.Auto name="confirmPassword" />

        <DrivingSchoolForm.Button.Submit>Сохранить новый пароль</DrivingSchoolForm.Button.Submit>
      </VStack>
    </DrivingSchoolForm>
  )
}
