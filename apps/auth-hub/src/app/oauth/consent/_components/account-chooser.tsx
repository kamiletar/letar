'use client'

import { signOut } from '@/lib/auth-client'
import { Avatar, Box, Button, HStack, Stack, Text } from '@chakra-ui/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { LuLogIn, LuUserPlus, LuX } from 'react-icons/lu'

interface AccountChooserProps {
  user: {
    name: string | null
    email: string
    image: string | null
  }
  /** Полные OIDC-параметры из cookie oidc_pending (authorize wrappe). Если null — fallback на consent params. */
  oidcParams: Record<string, string> | null
}

/**
 * Account chooser для OIDC авторизации (как у Google).
 *
 * Отображает текущий залогиненный аккаунт + варианты:
 * - Продолжить под этим аккаунтом → POST /api/auth/oauth2/consent (accept=true)
 * - Войти под другим → signOut + redirect на /sign-in с сохранением OIDC params
 * - Отмена → POST /api/auth/oauth2/consent (accept=false)
 */
export function AccountChooser({ user, oidcParams }: AccountChooserProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const consentCode = searchParams.get('consent_code')
  const clientId = searchParams.get('client_id')
  const scope = searchParams.get('scope')

  const [pending, setPending] = useState<'continue' | 'switch' | 'cancel' | null>(null)

  // POST на consent endpoint — Better Auth вернёт redirectURI с кодом или ошибкой
  const submitConsent = useCallback(
    async (accept: boolean) => {
      const res = await fetch('/api/auth/oauth2/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accept,
          consent_code: consentCode,
          client_id: clientId,
          scope,
        }),
        redirect: 'follow',
      })

      const data = await res.json().catch(() => null)
      if (data?.redirectURI) {
        window.location.href = data.redirectURI
      } else if (res.redirected) {
        window.location.href = res.url
      }
    },
    [consentCode, clientId, scope],
  )

  const handleContinue = useCallback(async () => {
    setPending('continue')
    try {
      await submitConsent(true)
    } finally {
      setPending(null)
    }
  }, [submitConsent])

  const handleCancel = useCallback(async () => {
    setPending('cancel')
    try {
      await submitConsent(false)
    } finally {
      setPending(null)
    }
  }, [submitConsent])

  // Смена аккаунта: signOut + редирект на /sign-in с полными OIDC params.
  // Если oidcParams из cookie доступны (authorize wrapper) — используем их:
  // они содержат redirect_uri / state / code_challenge, которых нет на consent page.
  // Fallback: только consent params (client_id, scope) — устаревшее поведение.
  const handleSwitchAccount = useCallback(async () => {
    setPending('switch')
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            if (oidcParams && oidcParams.redirect_uri && oidcParams.response_type) {
              router.push(`/sign-in?${new URLSearchParams(oidcParams).toString()}`)
              return
            }
            // Fallback: consent page params только
            const qs = new URLSearchParams()
            if (clientId) {qs.set('client_id', clientId)}
            if (scope) {qs.set('scope', scope)}
            for (const [k, v] of searchParams.entries()) {
              if (!qs.has(k)) {qs.set(k, v)}
            }
            router.push(`/sign-in?${qs.toString()}`)
          },
        },
      })
    } finally {
      setPending(null)
    }
  }, [clientId, scope, searchParams, router, oidcParams])

  const displayName = user.name ?? user.email
  const initials = (user.name ?? user.email).slice(0, 1).toUpperCase()

  return (
    <Stack gap={4}>
      {/* Карточка текущего пользователя */}
      <Box
        borderWidth="1px"
        borderRadius="md"
        p={3}
        _hover={{ bg: 'bg.muted', cursor: 'pointer' }}
        onClick={() => {
          if (!pending) {
            handleContinue()
          }
        }}
        opacity={pending === 'continue' ? 0.6 : 1}
        transition="all 0.15s"
      >
        <HStack gap={3}>
          <Avatar.Root size="md">
            {user.image ? <Avatar.Image src={user.image} alt={displayName} /> : null}
            <Avatar.Fallback>{initials}</Avatar.Fallback>
          </Avatar.Root>
          <Stack gap={0} flex={1} minW={0}>
            <Text fontWeight="semibold" truncate>
              {displayName}
            </Text>
            <Text fontSize="sm" color="fg.muted" truncate>
              {user.email}
            </Text>
          </Stack>
          <LuLogIn aria-hidden />
        </HStack>
      </Box>

      <Button
        colorPalette="brand"
        onClick={handleContinue}
        loading={pending === 'continue'}
        disabled={pending !== null && pending !== 'continue'}
        w="full"
      >
        Продолжить как {user.name ?? user.email.split('@')[0]}
      </Button>

      <Button
        variant="outline"
        onClick={handleSwitchAccount}
        loading={pending === 'switch'}
        disabled={pending !== null && pending !== 'switch'}
        w="full"
      >
        <LuUserPlus />
        Войти под другим аккаунтом
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={handleCancel}
        loading={pending === 'cancel'}
        disabled={pending !== null && pending !== 'cancel'}
        w="full"
      >
        <LuX />
        Отмена
      </Button>
    </Stack>
  )
}
