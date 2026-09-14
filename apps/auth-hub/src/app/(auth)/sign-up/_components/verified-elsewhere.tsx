'use client'

import { authClient } from '@/lib/auth-client'
import { Button, Spinner, Stack, Text } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

interface VerifiedElsewhereProps {
  email: string
  /** OIDC-продолжение или '/', см. usePostSignInCallback */
  callbackUrl: string
}

type CheckStatus = 'checking' | 'has-session' | 'no-session'

/**
 * Экран «Email подтверждён в другой вкладке/устройстве» (PLAN_EMAIL_CODE.md A.3).
 *
 * Честный текст в зависимости от того, есть ли у ЭТОГО браузера сессия:
 * - есть (ссылку открыли в этом же браузере, другой вкладке) — «Продолжить»;
 * - нет (ссылку открыли на телефоне) — «Email подтверждён. Войдите с паролем» на /sign-in,
 *   иначе было бы неправдой утверждать, что пользователь уже вошёл на этом устройстве.
 */
export function VerifiedElsewhere({ email, callbackUrl }: VerifiedElsewhereProps) {
  const [status, setStatus] = useState<CheckStatus>('checking')

  useEffect(() => {
    let cancelled = false

    authClient.getSession({ query: { disableCookieCache: true } }).then(({ data }) => {
      if (cancelled) {
        return
      }
      setStatus(data?.user?.emailVerified ? 'has-session' : 'no-session')
    })

    return () => {
      cancelled = true
    }
  }, [])

  if (status === 'checking') {
    return (
      <Stack gap={3} align="center" py={6}>
        <Spinner />
      </Stack>
    )
  }

  if (status === 'has-session') {
    return (
      <Stack gap={4} textAlign="center" py={4}>
        <Text fontWeight="bold" fontSize="lg">
          Email подтверждён
        </Text>
        <Button
          colorPalette="brand"
          w="full"
          onClick={() => {
            window.location.href = callbackUrl
          }}
        >
          Продолжить
        </Button>
      </Stack>
    )
  }

  const signInHref = `/sign-in?email=${encodeURIComponent(email)}&callbackUrl=${encodeURIComponent(callbackUrl)}`

  return (
    <Stack gap={4} textAlign="center" py={4}>
      <Text fontWeight="bold" fontSize="lg">
        Email подтверждён
      </Text>
      <Text color="fg.muted">Войдите с паролем, чтобы продолжить</Text>
      <Button
        colorPalette="brand"
        w="full"
        onClick={() => {
          window.location.href = signInHref
        }}
      >
        Войти
      </Button>
    </Stack>
  )
}
