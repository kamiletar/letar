import { Card, Heading, HStack, Separator, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from './_components/login-form'
import { MagicLinkForm } from './_components/magic-link-form'
import { AuthOAuthButtons } from './_components/oauth-buttons'

export const metadata: Metadata = {
  title: 'Вход',
}

/**
 * Страница входа — два столбца: OAuth и email/password
 */
export default function SignInPage() {
  return (
    <Card.Root maxW="4xl" w="full" mx={4}>
      <Card.Body>
        <HStack gap={8} align="stretch" flexDir={{ base: 'column', md: 'row' }}>
          {/* Левая колонка — быстрый вход через соцсети */}
          <Stack flex={1} gap={4}>
            <Heading size="lg">Войти</Heading>
            <Text color="fg.muted" fontSize="sm">
              Единый аккаунт для всех сервисов Letar
            </Text>
            <Suspense>
              <AuthOAuthButtons />
            </Suspense>
          </Stack>

          <Separator orientation="vertical" display={{ base: 'none', md: 'block' }} />
          <Separator display={{ base: 'block', md: 'none' }} />

          {/* Правая колонка — email/password и magic link */}
          <Stack flex={1} gap={4}>
            <Heading size="md">Вход по email</Heading>
            <Suspense>
              <LoginForm />
            </Suspense>

            <Separator />

            <Text fontSize="sm" color="fg.muted" textAlign="center">
              или без пароля
            </Text>
            <Suspense>
              <MagicLinkForm />
            </Suspense>
          </Stack>
        </HStack>
      </Card.Body>
      <Card.Footer justifyContent="center">
        <Text fontSize="xs" color="fg.subtle" textAlign="center">
          Единый аккаунт для всех сервисов *.letar.best
        </Text>
      </Card.Footer>
    </Card.Root>
  )
}
