'use client'

import { registerUser } from '@/app/[locale]/(auth)/_actions/register.action'
import { RegisterSchema } from '@/app/[locale]/(auth)/_schemas/register.schema'
import { Link } from '@/i18n/navigation'
import { KamiForm } from '@/kami-form'
import { Box, Link as ChakraLink, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

interface RegisterFormProps {
  onSuccess?: (email: string) => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const t = useTranslations('auth')
  const [submissionError, setSubmissionError] = useState<string | null>(null)

  const handleSubmit = async (data: { email: string; password: string; acceptPrivacy: boolean }) => {
    setSubmissionError(null)

    const result = await registerUser({ email: data.email, password: data.password })

    if (result.success) {
      onSuccess?.(result.email)
      return
    }

    // Преобразуем коды ошибок в понятные сообщения
    switch (result.error) {
      case 'EMAIL_EXISTS':
        setSubmissionError(t('errors.emailExists'))
        break
      default:
        setSubmissionError(t('errors.unknown'))
    }
  }

  return (
    <KamiForm
      initialValue={{ email: '', password: '', acceptPrivacy: false }}
      schema={RegisterSchema}
      onSubmit={handleSubmit}
    >
      <VStack gap={4} align="stretch">
        {submissionError && (
          <Box
            p={3}
            borderRadius="md"
            bg={{ base: 'red.50', _dark: 'red.950/30' }}
            borderWidth="1px"
            borderColor={{ base: 'red.200', _dark: 'red.800' }}
          >
            <Text color={{ base: 'red.600', _dark: 'red.300' }} fontSize="sm">
              {submissionError}
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

        <KamiForm.Field.Password name="password" label={t('password')} placeholder={t('minCharacters', { count: 8 })} />

        {/* Чекбокс политики конфиденциальности */}
        <KamiForm.Field.Checkbox
          name="acceptPrivacy"
          label={
            <Text as="span" fontSize="sm">
              {t('acceptPrivacy')}{' '}
              <ChakraLink asChild colorPalette="brand">
                <Link href="/privacy">{t('privacyPolicy')}</Link>
              </ChakraLink>
            </Text>
          }
        />

        <KamiForm.Button.Submit>{t('signUp')}</KamiForm.Button.Submit>
      </VStack>
    </KamiForm>
  )
}
