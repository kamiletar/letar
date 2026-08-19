'use client'

import { Box, Button, Container, Spinner, Text, VStack } from '@chakra-ui/react'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { LuRefreshCw } from 'react-icons/lu'

import { signInWithLetarAuth } from '@/lib/auth-client'

/**
 * Страница входа — авто-редирект на ключницу (auth.letar.best).
 * При ошибке показывает сообщение и кнопку «Попробовать снова».
 *
 * ⚠️ callbackURL передаётся ЯВНО (searchParams или '/'), а не через дефолт
 * signInWithLetarAuth() — тот берёт текущий URL страницы, а текущий URL здесь
 * всегда сама /sign-in. Без явного значения после успешного входа Ключница
 * возвращала бы пользователя обратно на /sign-in — бесконечный редирект-луп
 * (найдено и исправлено в studio, тот же баг платформенный — см. PLAN.md §41).
 */
function SignInContent() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const attemptSignIn = useCallback(async () => {
    setError(null)
    setLoading(true)
    const callbackURL = searchParams.get('callbackURL') || '/'
    const errorMessage = await signInWithLetarAuth(callbackURL)
    if (errorMessage) {
      setError(errorMessage)
      setLoading(false)
    }
    // При успехе — redirect, loading остаётся true
  }, [searchParams])

  useEffect(() => {
    attemptSignIn()
  }, [attemptSignIn])

  return (
    <VStack gap={4} bg="bg.surface" p={8} borderRadius="xl" shadow="lg" border="1px solid" borderColor="border">
      {loading
        ? (
          <>
            <Spinner size="xl" color="brand.500" />
            <Text color="fg.muted" textAlign="center">
              Перенаправление на auth.letar.best...
            </Text>
          </>
        )
        : (
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
  )
}

// `useSearchParams()` требует границу Suspense при статическом рендере — иначе
// `next build` падает: "useSearchParams() should be wrapped in a suspense boundary".
export default function SignInPage() {
  return (
    <Box minH="100vh" bg="bg" display="flex" alignItems="center" justifyContent="center">
      <Container maxW="sm">
        <Suspense
          fallback={
            <VStack gap={4} bg="bg.surface" p={8} borderRadius="xl" shadow="lg" border="1px solid" borderColor="border">
              <Spinner size="xl" color="brand.500" />
            </VStack>
          }
        >
          <SignInContent />
        </Suspense>
      </Container>
    </Box>
  )
}
