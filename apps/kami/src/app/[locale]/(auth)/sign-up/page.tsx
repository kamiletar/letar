import { Link } from '@/i18n/navigation'
import { Box, Button, Container, Heading, Text, VStack } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { LuKeyRound } from 'react-icons/lu'

export const metadata: Metadata = {
  title: 'Регистрация — Kami',
}

/**
 * Регистрация нового аккаунта происходит на Ключнице (auth.letar.best).
 * Kami не имеет собственной формы регистрации — перенаправляем на sign-in.
 */
export default function SignUpPage() {
  return (
    <Container maxW="sm" py={{ base: 12, md: 20 }}>
      <VStack gap={8} align="stretch">
        <VStack gap={2} textAlign="center">
          <Heading size="2xl" fontFamily="mono">
            Kami
          </Heading>
          <Text fontSize="lg" fontWeight="semibold">
            Регистрация
          </Text>
        </VStack>

        <Box p={8} borderWidth="1px" borderColor="border" borderRadius="xl" bg="bg.panel" shadow="lg">
          <VStack gap={4} align="stretch" textAlign="center">
            <LuKeyRound size={32} style={{ alignSelf: 'center' }} />
            <Text fontWeight="medium">Регистрация через Ключницу</Text>
            <Text color="fg.muted" fontSize="sm">
              Аккаунты kami управляются через единую систему входа letar.best. Для регистрации нажмите «Войти» —
              Ключница предложит создать аккаунт, если вы заходите впервые.
            </Text>
            <Button colorPalette="brand" size="lg" asChild>
              <Link href="/sign-in">
                <LuKeyRound />
                Войти через Ключницу
              </Link>
            </Button>
          </VStack>
        </Box>
      </VStack>
    </Container>
  )
}
