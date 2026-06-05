import { Card, Heading, HStack, Separator, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { LoginForm } from './_components/login-form'
import { MagicLinkForm } from './_components/magic-link-form'
import { AuthOAuthButtons } from './_components/oauth-buttons'

export const metadata: Metadata = {
  title: 'Вход',
}

/**
 * Страница входа — два столбца: OAuth и email/password.
 *
 * Если открыта в контексте OIDC authorization flow (присутствуют
 * client_id, redirect_uri, response_type), делает редирект на
 * Route Handler /api/oidc-capture, который сохраняет OIDC-параметры
 * в httpOnly cookie и возвращает на чистый /sign-in.
 *
 * cookies().set() запрещён в Server Components (Next.js 15+), поэтому
 * сохранение cookie вынесено в Route Handler.
 */
export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams

  // Если OIDC-flow — делегируем сохранение cookie Route Handler'у
  if (params.client_id && params.redirect_uri && params.response_type) {
    const qs = new URLSearchParams(params).toString()
    redirect(`/api/oidc-capture?${qs}`)
  }

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
