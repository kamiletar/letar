'use client'

import { loginUser } from '@/app/(auth)/_actions/login.action'
import { LoginSchema } from '@/app/(auth)/_schemas/login.schema'
import { DrivingSchoolForm } from '@/driving-school-form'
import { Box, Link, Text, VStack } from '@chakra-ui/react'
import { useDeclarativeForm } from '@letar/forms'
import { useStore } from '@tanstack/react-form'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { type ReactElement, useState } from 'react'

interface LoginFormProps {
  callbackUrl?: string
}

/** Тип состояния формы логина */
interface LoginFormState {
  values: { email: string; password: string }
}

/** Вспомогательный компонент для доступа к email из контекста формы */
function ForgotPasswordLink(): ReactElement {
  const { form } = useDeclarativeForm()
  const emailValue = useStore(form.store, (state) => (state as LoginFormState).values.email)

  const href = emailValue ? `/forgot-password?email=${encodeURIComponent(emailValue)}` : '/forgot-password'

  return (
    <Text fontSize="sm" color="fg.muted" textAlign="center">
      <Link asChild colorPalette="orange" fontWeight="medium">
        <NextLink href={href}>Забыли пароль?</NextLink>
      </Link>
    </Text>
  )
}

export function LoginForm({ callbackUrl = '/dashboard' }: LoginFormProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (data: { email: string; password: string }) => {
    setFormError(null)

    const result = await loginUser({ ...data, callbackUrl })

    if (result.success) {
      router.push(callbackUrl)
      return
    }

    // Преобразуем коды ошибок в понятные сообщения
    switch (result.error) {
      case 'INVALID_CREDENTIALS':
        setFormError('Неверный email или пароль')
        break
      case 'EMAIL_NOT_VERIFIED':
        setFormError('Email не подтверждён. Проверьте почту.')
        break
      default:
        setFormError('Произошла ошибка при входе')
    }
  }

  return (
    <DrivingSchoolForm initialValue={{ email: '', password: '' }} schema={LoginSchema} onSubmit={handleSubmit}>
      <VStack gap={4} align="stretch">
        {formError && (
          <Box layerStyle="panel.error">
            <Text color="error.fg" fontSize="sm">
              {formError}
            </Text>
          </Box>
        )}

        <DrivingSchoolForm.Field.Auto name="email" autoComplete="email" />
        <DrivingSchoolForm.Field.Auto name="password" />

        <DrivingSchoolForm.Button.Submit>Войти</DrivingSchoolForm.Button.Submit>

        <ForgotPasswordLink />
      </VStack>
    </DrivingSchoolForm>
  )
}
