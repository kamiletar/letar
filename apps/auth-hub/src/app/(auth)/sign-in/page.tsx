import { BLOCKED_FOR_RU, getCountryCode } from '@/lib/geo'
import { Card, Heading, HStack, Separator, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from './_components/login-form'
import { MagicLinkForm } from './_components/magic-link-form'
import { AuthOAuthButtons } from './_components/oauth-buttons'
import { OidcPendingCapture } from './_components/oidc-pending-capture'
import { PasskeySignInButton } from './_components/passkey-button'
import { TelegramSignInButton } from './_components/telegram-button'

export const metadata: Metadata = {
  title: 'Вход',
}

const ALL_OAUTH_PROVIDERS = ['google', 'github', 'facebook', 'vk', 'yandex'] as const
type OAuthProvider = (typeof ALL_OAUTH_PROVIDERS)[number]

/**
 * Страница входа — два столбца: OAuth и email/password.
 *
 * Если открыта в контексте OIDC authorization_code flow, OIDC-параметры
 * остаются в URL (usePostSignInCallback читает их и строит callbackUrl
 * на /api/auth/oauth2/authorize). Для социального OAuth (GitHub, Google…)
 * клиентский OidcPendingCapture сохраняет параметры в cookie через fetch
 * на /api/oidc-capture, не нарушая Next.js ограничение "cookies() только
 * в Server Action / Route Handler".
 *
 * Для RU-IP скрываем иностранных провайдеров (149-ФЗ): google/github/facebook/telegram.
 * Passkeys оставляем — локальный механизм без иностранного сервиса.
 * Fallback: если заголовок x-forwarded-for отсутствует (dev) — показываем всё.
 */
export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams
  const hasOidc = !!(params.client_id && params.redirect_uri && params.response_type)
  const hasTelegram = !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME)

  const countryCode = await getCountryCode()
  const isRussianIp = countryCode === 'RU'
  const allowedProviders = ALL_OAUTH_PROVIDERS.filter((p): p is OAuthProvider => !isRussianIp || !BLOCKED_FOR_RU.has(p))

  return (
    <Card.Root maxW="4xl" w="full" mx={4}>
      {/* Сохраняем OIDC-параметры в cookie для social OAuth flow (client-side) */}
      {hasOidc && <OidcPendingCapture params={params} />}
      <Card.Body>
        <HStack gap={8} align="stretch" flexDir={{ base: 'column', md: 'row' }}>
          {/* Левая колонка — быстрый вход через соцсети и passkey */}
          <Stack flex={1} gap={4}>
            <Heading size="lg">Войти</Heading>
            <Text color="fg.muted" fontSize="sm">
              Единый аккаунт для всех сервисов Letar
            </Text>
            <Suspense>
              <AuthOAuthButtons providers={allowedProviders} />
            </Suspense>
            <PasskeySignInButton />
            {hasTelegram && !isRussianIp && <TelegramSignInButton />}
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
