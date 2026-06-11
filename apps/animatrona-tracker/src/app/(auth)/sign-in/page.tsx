'use client'

import { signInWithLetarAuth } from '@/lib/auth-client'
import { Box, Button, Container, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { LuFilm, LuKeyRound } from 'react-icons/lu'

function SignInContent() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('returnTo') ?? '/browse'

  return (
    <Box minH="100vh" bg="bg" display="flex" alignItems="center">
      <Container maxW="400px">
        <VStack gap={8}>
          <VStack gap={2}>
            <HStack gap={2}>
              <Icon as={LuFilm} boxSize={8} color="brand.500" />
              <Heading size="xl">Animatrona</Heading>
            </HStack>
            <Text color="fg.muted">Войдите в аккаунт</Text>
          </VStack>

          <Button w="100%" colorPalette="brand" onClick={() => signInWithLetarAuth(returnTo)}>
            <Icon as={LuKeyRound} mr={2} />
            Войти через Ключницу
          </Button>
        </VStack>
      </Container>
    </Box>
  )
}

/**
 * Next.js требует Suspense-boundary для useSearchParams в client-компоненте
 * при static rendering, иначе prerender падает.
 */
export default function SignInPage() {
  return (
    <Suspense>
      <SignInContent />
    </Suspense>
  )
}
