'use client'

import { Box, Button, Container, Spinner, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LuRefreshCw } from 'react-icons/lu'

import { signInWithLetarAuth } from '@/lib/auth-client'

/**
 * Страница входа — авто-редирект на ключницу (auth.letar.best).
 * При ошибке показывает сообщение и кнопку «Попробовать снова».
 */
export default function SignInPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const attemptSignIn = useCallback(async () => {
    setError(null)
    setLoading(true)
    const errorMessage = await signInWithLetarAuth()
    if (errorMessage) {
      setError(errorMessage)
      setLoading(false)
    }
    // При успехе — redirect, loading остаётся true
  }, [])

  useEffect(() => {
    attemptSignIn()
  }, [attemptSignIn])

  return (
    <Box minH="100vh" bg="bg" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="sm">
        <VStack gap={4} bg="bg.surface" p={8} borderRadius="xl" shadow="lg" border="1px solid" borderColor="border">
          {loading ? (
            <>
              <Spinner size="xl" color="brand.500" />
              <Text color="fg.muted" textAlign="center">
                Перенаправление на auth.letar.best...
              </Text>
            </>
          ) : (
            <>
              <Text color="fg.error" textAlign="center" fontSize="sm">
                {error}
              </Text>
              <Button onClick={attemptSignIn} variant="outline" size="md">
                <LuRefreshCw />
                Попробовать снова
              </Button>
            </>
          )}
        </VStack>
      </Container>
    </Box>
  )
}
