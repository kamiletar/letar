'use client'

import { useRouter } from '@/i18n/navigation'
import { Button } from '@chakra-ui/react'

/**
 * Client-кнопка «Войти» с push на /auth/signin.
 * Используется в:
 * - <AuthButton /> (Server Component обёртка с проверкой сессии)
 * - <Header /> мобильной версии напрямую как fallback в OnlyFor
 */
export function SignInButtonClient() {
  const router = useRouter()

  return (
    <Button
      data-testid="auth-button"
      onClick={() => router.push('/auth/signin')}
      colorPalette="fg"
      backgroundColor={'fg'}
      gap={2}
    >
      Войти
    </Button>
  )
}
