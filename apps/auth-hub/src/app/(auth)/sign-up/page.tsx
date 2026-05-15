import { Box, Card, Heading, HStack, Separator, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import NextLink from 'next/link'
import { Suspense } from 'react'
import { AuthOAuthButtons } from '../sign-in/_components/oauth-buttons'
import { RegisterForm } from './_components/register-form'

export const metadata: Metadata = {
  title: 'Регистрация',
}

/**
 * Страница регистрации
 */
export default function SignUpPage() {
  return (
    <Card.Root maxW="4xl" w="full" mx={4}>
      <Card.Body>
        <HStack gap={8} align="stretch" flexDir={{ base: 'column', md: 'row' }}>
          {/* Левая колонка — быстрая регистрация через соцсети */}
          <Stack flex={1} gap={4}>
            <Heading size="lg">Регистрация</Heading>
            <Text color="fg.muted" fontSize="sm">
              Единый аккаунт для всех сервисов Letar
            </Text>
            <Suspense>
              <AuthOAuthButtons />
            </Suspense>
          </Stack>

          <Separator orientation="vertical" display={{ base: 'none', md: 'block' }} />
          <Separator display={{ base: 'block', md: 'none' }} />

          {/* Правая колонка — регистрация по email */}
          <Stack flex={1} gap={4}>
            <Heading size="md">Регистрация по email</Heading>
            <RegisterForm />
          </Stack>
        </HStack>
      </Card.Body>
      <Card.Footer justifyContent="center">
        <Text fontSize="sm" color="fg.muted">
          Уже есть аккаунт?{' '}
          <Box asChild color="colorPalette.fg" fontWeight="medium">
            <NextLink href="/sign-in">Войти</NextLink>
          </Box>
        </Text>
      </Card.Footer>
    </Card.Root>
  )
}
