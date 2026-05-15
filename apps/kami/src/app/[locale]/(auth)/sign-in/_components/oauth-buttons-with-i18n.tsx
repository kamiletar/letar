'use client'

import { OAuthButtons, signInWithLetarAuth } from '@/lib/auth-client'
import { Button, Separator, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuKeyRound } from 'react-icons/lu'
import { useTranslations } from 'next-intl'

interface OAuthButtonsWithI18nProps {
  callbackUrl?: string
}

/**
 * OAuth кнопки с переводами next-intl + вход через Ключницу
 */
export function OAuthButtonsWithI18n({ callbackUrl = '/' }: OAuthButtonsWithI18nProps) {
  const t = useTranslations('auth')
  const [loading, setLoading] = useState(false)

  async function handleLetarAuth() {
    setLoading(true)
    await signInWithLetarAuth(callbackUrl)
  }

  return (
    <VStack gap={3} w="full">
      {/* Вход через Ключницу — главный способ */}
      <Button w="full" colorPalette="brand" onClick={handleLetarAuth} loading={loading}>
        <LuKeyRound />
        Войти через Ключницу
      </Button>

      <Separator />
      <Text fontSize="xs" color="fg.muted">
        Или напрямую
      </Text>

      <OAuthButtons
        callbackUrl={callbackUrl}
        providers={[
          { id: 'github' },
          { id: 'google' },
          { id: 'facebook' as never },
          { id: 'yandex' },
          { id: 'telegram', disabled: true },
        ]}
        getButtonLabel={(provider) => {
          const providerLabels: Record<string, string> = {
            github: 'GitHub',
            google: 'Google',
            facebook: 'Facebook',
            yandex: 'Яндекс',
            telegram: 'Telegram',
          }
          return t('continueWith', { provider: providerLabels[provider] })
        }}
      />
    </VStack>
  )
}
