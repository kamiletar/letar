'use client'

import { requestPasswordReset } from '@/app/(auth)/_actions/forgot-password.action'
import { ForgotPasswordSchema } from '@/app/(auth)/_schemas/forgot-password.schema'
import { DrivingSchoolForm } from '@/driving-school-form'
import { Box, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { ResetPinForm } from './reset-pin-form'

interface ForgotPasswordFormProps {
  defaultEmail?: string
}

export function ForgotPasswordForm({ defaultEmail = '' }: ForgotPasswordFormProps) {
  const [formError, setFormError] = useState<string | null>(null)
  const [sentEmail, setSentEmail] = useState<string | null>(null)

  const handleSubmit = async (data: { email: string }) => {
    setFormError(null)

    const result = await requestPasswordReset(data)

    if (result.success) {
      // Всегда показываем успех, чтобы не раскрывать существование email
      setSentEmail(data.email)
      return
    }

    setFormError('Произошла ошибка. Попробуйте позже.')
  }

  // После успешной отправки показываем форму ввода PIN
  if (sentEmail) {
    return <ResetPinForm email={sentEmail} />
  }

  return (
    <DrivingSchoolForm initialValue={{ email: defaultEmail }} schema={ForgotPasswordSchema} onSubmit={handleSubmit}>
      <VStack gap={4} align="stretch">
        {formError && (
          <Box layerStyle="panel.error">
            <Text color="error.fg" fontSize="sm">
              {formError}
            </Text>
          </Box>
        )}

        <DrivingSchoolForm.Field.Auto name="email" autoComplete="email" />

        <DrivingSchoolForm.Button.Submit>Отправить код</DrivingSchoolForm.Button.Submit>
      </VStack>
    </DrivingSchoolForm>
  )
}
