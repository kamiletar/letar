import { Card, Heading, HStack, Separator, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import { LoginForm } from './_components/login-form'
import { MagicLinkForm } from './_components/magic-link-form'
import { AuthOAuthButtons } from './_components/oauth-buttons'

export const metadata: Metadata = {
  title: 'Вход',
}

/**
 * OIDC-параметры, которые сохраняем в cookie для последующего продолжения flow.
 * Ключи соответствуют стандарту OAuth 2.0 / OIDC.
 */
const OIDC_COOKIE_PARAMS = [
  'client_id',
  'redirect_uri',
  'response_type',
  'scope',
  'state',
  'code_challenge',
  'code_challenge_method',
  'nonce',
] as const

/**
 * Страница входа — два столбца: OAuth и email/password.
 *
 * Если открыта в контексте OIDC authorization flow (присутствуют
 * client_id, redirect_uri, response_type), сохраняет OIDC-параметры
 * в httpOnly cookie `oidc_pending`. После входа через соцсети route
 * `/auth/post-login` читает cookie и продолжает OIDC flow.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams

  // Сохраняем OIDC-параметры в cookie если страница открыта из OIDC flow
  if (params.client_id && params.redirect_uri && params.response_type) {
    const oidcParams: Record<string, string> = {}
    for (const key of OIDC_COOKIE_PARAMS) {
      if (params[key]) {
        oidcParams[key] = params[key]
      }
    }

    const cookieStore = await cookies()
    cookieStore.set('oidc_pending', Buffer.from(JSON.stringify(oidcParams)).toString('base64'), {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 600, // 10 минут — достаточно для прохождения OAuth
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    })
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
