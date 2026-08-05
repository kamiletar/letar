'use client'

import { type AuthClientWithOAuth, createAuthClientWithOAuth, createSignInWithLetarAuth } from '@letar/auth/client'

import { toaster } from '@/app/_components/ui/toaster'

/**
 * Клиент авторизации для archetest
 *
 * Использует genericOAuth для входа через ключницу (letar-auth)
 */
export const authClient: AuthClientWithOAuth = createAuthClientWithOAuth()

export const { useSession, signOut } = authClient

/**
 * Войти через ключницу.
 * При ошибке показывает toast пользователю.
 * Возвращает строку ошибки или null при успехе (redirect).
 */
export const signInWithLetarAuth = createSignInWithLetarAuth(authClient, {
  onError: (message) => toaster.create({ type: 'error', title: message }),
})
