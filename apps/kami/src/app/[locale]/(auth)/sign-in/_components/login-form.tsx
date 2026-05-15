'use client'

import { loginUser } from '@/app/[locale]/(auth)/_actions/login.action'
import { LoginSchema } from '@/app/[locale]/(auth)/_schemas/login.schema'
import { KamiForm } from '@/kami-form'
import { Box, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface LoginFormProps {
  callbackUrl?: string
}

export function LoginForm({ callbackUrl = '/' }: LoginFormProps) {
  const router = useRouter()
  const t = useTranslations('auth')
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (data: { email: string; password: string }) => {
    setSubmitError(null)

    const result = await loginUser({ ...data, callbackUrl })

    if (result.success) {
      router.push(callbackUrl)
      return
    }

    // Преобразуем коды ошибок в понятные сообщения
    switch (result.error) {
      case 'INVALID_CREDENTIALS':
        setSubmitError(t('errors.invalidCredentials'))
        break
      case 'EMAIL_NOT_VERIFIED':
        setSubmitError(t('errors.emailNotVerified'))
        break
      default:
        setSubmitError(t('errors.unknown'))
    }
  }

  return (
    <KamiForm initialValue={{ email: '', password: '' }} schema={LoginSchema} onSubmit={handleSubmit}>
      <VStack gap={4} align="stretch">
        {submitError && (
          <Box
            p={3}
            borderRadius="md"
            bg={{ base: 'red.50', _dark: 'red.950/30' }}
            borderWidth="1px"
            borderColor={{ base: 'red.200', _dark: 'red.800' }}
          >
            <Text color={{ base: 'red.600', _dark: 'red.300' }} fontSize="sm">
              {submitError}
            </Text>
          </Box>
        )}

        <KamiForm.Field.String
          name="email"
          label={t('email')}
          type="email"
          autoComplete="email"
          placeholder="your@email.com"
        />

        <KamiForm.Field.Password name="password" label={t('password')} placeholder={t('enterPassword')} />

        <KamiForm.Button.Submit>{t('signIn')}</KamiForm.Button.Submit>
      </VStack>
    </KamiForm>
  )
}
