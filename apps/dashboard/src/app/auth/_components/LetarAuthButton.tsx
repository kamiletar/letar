'use client'

import { signInWithLetarAuth } from '@/lib/auth-client'
import { Button, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { LuKeyRound } from 'react-icons/lu'

/**
 * Кнопка входа через Ключницу (auth.letar.best)
 */
export function LetarAuthButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    setLoading(true)

    const errorMessage = await signInWithLetarAuth('/')
    if (errorMessage) {
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <Stack gap={3}>
      <Button w="full" colorPalette="brand" onClick={handleClick} loading={loading}>
        <LuKeyRound />
        Войти через Ключницу
      </Button>
      {error && (
        <Text color="fg.error" fontSize="sm" textAlign="center">
          {error}
        </Text>
      )}
    </Stack>
  )
}
