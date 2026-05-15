'use client'

import { signIn } from '@/lib/auth-client'
import { Button, Icon, VStack } from '@chakra-ui/react'
import { GitHubIcon, GoogleIcon, VKIcon, YandexIcon } from '@letar/auth/client'
import { useLocale } from 'next-intl'
import { useState } from 'react'

/** Facebook иконка (inline, обход проблемы barrel re-export в tsgo) */
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.971H15.83c-1.491 0-1.956.93-1.956 1.886v2.264h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
      />
    </svg>
  )
}

interface OAuthButtonsProps {
  locale: string
}

/**
 * Кнопки OAuth авторизации (GitHub, Google, Yandex, Facebook, VK)
 */
export function OAuthButtons({ locale }: OAuthButtonsProps) {
  const currentLocale = useLocale()
  const [loading, setLoading] = useState<string | null>(null)

  const handleOAuth = (provider: string, method: 'social' | 'oauth2' = 'social') => {
    setLoading(provider)
    const promise =
      method === 'oauth2'
        ? signIn.oauth2({ providerId: provider, callbackURL: `/${locale}/` })
        : signIn.social({ provider: provider as 'github', callbackURL: `/${locale}/` })

    Promise.resolve(promise).catch(() => {
      setLoading(null)
    })
  }

  return (
    <VStack gap={3} w="full">
      {/* GitHub */}
      <Button
        type="button"
        w="full"
        size="lg"
        colorPalette="gray"
        variant="outline"
        onClick={() => handleOAuth('github')}
        loading={loading === 'github'}
        disabled={loading !== null}
      >
        <Icon asChild boxSize={5}>
          <GitHubIcon />
        </Icon>
        {currentLocale === 'ru' ? 'Войти через GitHub' : 'Sign in with GitHub'}
      </Button>

      {/* Google */}
      <Button
        type="button"
        w="full"
        size="lg"
        colorPalette="gray"
        variant="outline"
        onClick={() => handleOAuth('google')}
        loading={loading === 'google'}
        disabled={loading !== null}
      >
        <Icon asChild boxSize={5}>
          <GoogleIcon />
        </Icon>
        {currentLocale === 'ru' ? 'Войти через Google' : 'Sign in with Google'}
      </Button>

      {/* Facebook */}
      <Button
        type="button"
        w="full"
        size="lg"
        colorPalette="gray"
        variant="outline"
        onClick={() => handleOAuth('facebook')}
        loading={loading === 'facebook'}
        disabled={loading !== null}
      >
        <Icon asChild boxSize={5}>
          <FacebookIcon />
        </Icon>
        {currentLocale === 'ru' ? 'Войти через Facebook' : 'Sign in with Facebook'}
      </Button>

      {/* Yandex */}
      <Button
        type="button"
        w="full"
        size="lg"
        colorPalette="gray"
        variant="outline"
        onClick={() => handleOAuth('yandex', 'oauth2')}
        loading={loading === 'yandex'}
        disabled={loading !== null}
      >
        <Icon asChild boxSize={5}>
          <YandexIcon />
        </Icon>
        {currentLocale === 'ru' ? 'Войти через Яндекс' : 'Sign in with Yandex'}
      </Button>

      {/* VK (ВКонтакте) */}
      <Button
        type="button"
        w="full"
        size="lg"
        colorPalette="gray"
        variant="outline"
        onClick={() => handleOAuth('vk')}
        loading={loading === 'vk'}
        disabled={loading !== null}
      >
        <Icon asChild boxSize={5}>
          <VKIcon />
        </Icon>
        {currentLocale === 'ru' ? 'Войти через ВКонтакте' : 'Sign in with VK'}
      </Button>
    </VStack>
  )
}
