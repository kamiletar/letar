'use client'

import { sendMagicLinkAction } from '@/app/[locale]/(auth)/_actions/send-magic-link.action'
import { Box, Button, Icon, Input, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { LuMail, LuSend } from 'react-icons/lu'

/**
 * Форма запроса Magic Link для входа без пароля
 */
export function MagicLinkForm() {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'sent' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage(null)

    const result = await sendMagicLinkAction(email)

    if (result.success) {
      setStatus('sent')
    } else {
      setStatus('error')
      switch (result.error) {
        case 'EMAIL_NOT_VERIFIED':
          setErrorMessage(t('errors.emailNotVerified'))
          break
        case 'SEND_FAILED':
          setErrorMessage(t('errors.sendFailed'))
          break
        default:
          setErrorMessage(t('errors.unknown'))
      }
    }
  }

  // Успешная отправка
  if (status === 'sent') {
    return (
      <Box
        p={4}
        borderRadius="md"
        bg={{ base: 'green.50', _dark: 'green.950/30' }}
        borderWidth="1px"
        borderColor={{ base: 'green.200', _dark: 'green.800' }}
      >
        <VStack gap={2}>
          <Icon color={{ base: 'green.500', _dark: 'green.400' }} boxSize={8}>
            <LuMail />
          </Icon>
          <Text color={{ base: 'green.700', _dark: 'green.300' }} fontWeight="medium" textAlign="center">
            {t('magicLinkSent')}
          </Text>
          <Text color={{ base: 'green.600', _dark: 'green.400' }} fontSize="sm" textAlign="center">
            {t('checkYourEmail', { email })}
          </Text>
        </VStack>
      </Box>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <VStack gap={4} align="stretch">
        {errorMessage && (
          <Box
            p={3}
            borderRadius="md"
            bg={{ base: 'red.50', _dark: 'red.950/30' }}
            borderWidth="1px"
            borderColor={{ base: 'red.200', _dark: 'red.800' }}
          >
            <Text color={{ base: 'red.600', _dark: 'red.300' }} fontSize="sm">
              {errorMessage}
            </Text>
          </Box>
        )}

        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('emailPlaceholder')}
          required
          disabled={status === 'loading'}
        />

        <Button type="submit" colorPalette="brand" size="lg" disabled={status === 'loading' || !email}>
          <LuSend />
          {status === 'loading' ? t('sending') : t('sendMagicLink')}
        </Button>

        <Text color="fg.muted" fontSize="xs" textAlign="center">
          {t('magicLinkDescription')}
        </Text>
      </VStack>
    </form>
  )
}
