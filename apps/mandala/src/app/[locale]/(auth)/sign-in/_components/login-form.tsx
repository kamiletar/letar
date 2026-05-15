'use client'

import { loginUser } from '@/app/[locale]/(auth)/_actions/login.action'
import { LoginSchema } from '@/app/[locale]/(auth)/_schemas/login.schema'
import { Link as LocalizedLink, useRouter } from '@/i18n/navigation'
import { Box, Link, Text, VStack } from '@chakra-ui/react'
import { Form } from '@letar/forms'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

interface LoginFormProps {
  callbackUrl?: string
}

export function LoginForm({ callbackUrl = '/' }: LoginFormProps) {
  const router = useRouter()
  const t = useTranslations('auth.loginForm')
  const tErrors = useTranslations('auth.errors')
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (data: { email: string; password: string }) => {
    setFormError(null)

    const result = await loginUser({ ...data, callbackUrl })

    if (result.success) {
      router.push(callbackUrl)
      router.refresh()
      return
    }

    // Преобразуем коды ошибок в понятные сообщения
    switch (result.error) {
      case 'INVALID_CREDENTIALS':
        setFormError(tErrors('invalidCredentials'))
        break
      case 'EMAIL_NOT_VERIFIED':
        setFormError(tErrors('emailNotVerified'))
        break
      default:
        setFormError(tErrors('unknownError'))
    }
  }

  return (
    <Form initialValue={{ email: '', password: '' }} schema={LoginSchema} onSubmit={handleSubmit}>
      <VStack gap={4} align="stretch">
        {formError && (
          <Box
            layerStyle="panel.error"
            p={3}
            borderRadius="md"
            bg="red.900/20"
            borderWidth="1px"
            borderColor="red.500/30"
          >
            <Text color="red.300" fontSize="sm">
              {formError}
            </Text>
          </Box>
        )}

        <Form.Field.String
          name="email"
          label={t('email')}
          type="email"
          autoComplete="email"
          placeholder="your@email.com"
        />

        <Form.Field.String name="password" label={t('password')} type="password" autoComplete="current-password" />

        <Form.Button.Submit colorPalette="fg" size="lg" width="full">
          {t('submit')}
        </Form.Button.Submit>

        <Text fontSize="sm" color="fg.muted" textAlign="center">
          <Link asChild colorPalette="fg" fontWeight="medium">
            <LocalizedLink href="/forgot-password">{t('forgotPassword')}</LocalizedLink>
          </Link>
        </Text>
      </VStack>
    </Form>
  )
}
