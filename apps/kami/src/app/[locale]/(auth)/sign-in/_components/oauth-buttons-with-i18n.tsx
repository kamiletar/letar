'use client'

import { signInWithLetarAuth } from '@/lib/auth-client'
import { Button, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuKeyRound } from 'react-icons/lu'

interface OAuthButtonsWithI18nProps {
  callbackUrl?: string
}

/**
 * Кнопка входа через Ключницу (auth.letar.best).
 * Единственный способ авторизации в kami.
 */
export function OAuthButtonsWithI18n({ callbackUrl = '/' }: OAuthButtonsWithI18nProps) {
  const [loading, setLoading] = useState(false)

  async function handleLetarAuth() {
    setLoading(true)
    await signInWithLetarAuth(callbackUrl)
  }

  return (
    <VStack gap={3} w="full">
      <Button
        w="full"
        size="lg"
        colorPalette="brand"
        onClick={handleLetarAuth}
        loading={loading}
        loadingText="Перенаправление..."
      >
        <LuKeyRound />
        Войти через Ключницу
      </Button>
    </VStack>
  )
}
