'use client'

import { authClient } from '@/lib/auth-client'
import { Button, Icon, Separator, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { FaGoogle } from 'react-icons/fa'
import { YandexIcon } from './yandex-icon'

/**
 * Клиентские кнопки OAuth для Google и Yandex
 *
 * Google — встроенный провайдер (signIn.social)
 * Yandex — genericOAuth плагин (signIn.oauth2)
 */
export function OAuthButtons() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)

  const handleGoogleSignIn = async () => {
    setLoadingProvider('google')
    try {
      await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/',
      })
    } catch (error) {
      console.error('Google sign in error:', error)
      setLoadingProvider(null)
    }
  }

  const handleYandexSignIn = async () => {
    setLoadingProvider('yandex')
    try {
      await authClient.signIn.oauth2({
        providerId: 'yandex',
        callbackURL: '/',
      })
    } catch (error) {
      console.error('Yandex sign in error:', error)
      setLoadingProvider(null)
    }
  }

  return (
    <VStack w="full" gap={4}>
      <Separator />
      <Text fontSize="sm" color="gray.600">
        Или
      </Text>

      <Button
        data-testid="oauth-button-google"
        onClick={handleGoogleSignIn}
        loading={loadingProvider === 'google'}
        disabled={loadingProvider !== null}
        w="full"
        size="lg"
        backgroundColor={'#507fe5'}
        gap={3}
      >
        <FaGoogle />
        Войти через Google
      </Button>

      <Separator />

      <Button
        data-testid="oauth-button-yandex"
        onClick={handleYandexSignIn}
        loading={loadingProvider === 'yandex'}
        disabled={loadingProvider !== null}
        w="full"
        size="lg"
        colorPalette="red"
        backgroundColor={'#FC3F1D'}
        gap={3}
      >
        <Icon color={'white'}>
          <YandexIcon />
        </Icon>
        Войти через Яндекс
      </Button>
    </VStack>
  )
}
