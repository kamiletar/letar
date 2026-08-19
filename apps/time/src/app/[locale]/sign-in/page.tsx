'use client'

import { Box, Spinner, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

import { useRouter } from '@/i18n/navigation'
import { signInWithLetarAuth, useSession } from '@/lib/auth-client'

/**
 * Страница входа — авто-редирект на OIDC
 *
 * ⚠️ callbackURL передаётся ЯВНО (searchParams или '/'), а не через дефолт
 * signInWithLetarAuth() — тот берёт текущий URL страницы, а текущий URL здесь
 * всегда сама /sign-in. Без явного значения после успешного входа Ключница
 * возвращала бы пользователя обратно на /sign-in — бесконечный редирект-луп
 * (найдено и исправлено в studio, тот же баг платформенный — см. корневой PLAN.md §41).
 */
function SignInContent() {
  const t = useTranslations('signIn')
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session) {
      router.push('/')
    } else {
      signInWithLetarAuth(searchParams.get('callbackURL') || '/')
    }
  }, [session, router, searchParams])

  return (
    <VStack gap={3}>
      <Spinner size="md" />
      <Text fontWeight="100" letterSpacing="0.08em">
        {t('redirecting')}
      </Text>
    </VStack>
  )
}

// `useSearchParams()` требует границу Suspense при статическом рендере — иначе
// `next build` падает: "useSearchParams() should be wrapped in a suspense boundary".
export default function SignInPage() {
  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
      <Suspense
        fallback={
          <VStack gap={3}>
            <Spinner size="md" />
          </VStack>
        }
      >
        <SignInContent />
      </Suspense>
    </Box>
  )
}
