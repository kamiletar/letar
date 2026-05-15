'use client'

import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

import { signInWithLetarAuth } from '@/lib/auth-client'

function SignInContent() {
  const searchParams = useSearchParams()
  // Если страница открыта из защищённого роута — прокси передаёт returnTo,
  // иначе фоллбэк на главную
  const returnTo = searchParams.get('returnTo') ?? '/'
  const [loading, setLoading] = useState(false)

  async function handleSignIn() {
    setLoading(true)
    await signInWithLetarAuth(returnTo)
    setLoading(false)
  }

  return (
    <Container maxW="sm" py={20}>
      <VStack gap={6} align="stretch">
        <Box textAlign="center">
          <Heading as="h1" size="2xl" mb={2}>
            Вход
          </Heading>
          <Text color="fg.muted">Войдите через единую систему авторизации</Text>
        </Box>

        <Button
          size="lg"
          colorPalette="brand"
          onClick={handleSignIn}
          loading={loading}
          loadingText="Перенаправление..."
          w="full"
        >
          Войти через Ключницу
        </Button>

        <Text textAlign="center" fontSize="sm" color="fg.subtle">
          Google, GitHub, VK, Yandex и другие способы входа
        </Text>
      </VStack>
    </Container>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  )
}
