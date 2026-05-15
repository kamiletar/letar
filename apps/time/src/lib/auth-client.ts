'use client'

import { type AuthClientWithOAuth, createAuthClientWithOAuth } from '@letar/auth/client'

/**
 * Клиент авторизации для time
 *
 * Использует genericOAuth для входа через ключницу (letar-auth)
 */
export const authClient: AuthClientWithOAuth = createAuthClientWithOAuth()

export const { useSession, signOut } = authClient

/**
 * Войти через ключницу
 */
export function signInWithLetarAuth() {
  return authClient.signIn.oauth2({
    providerId: 'letar-auth',
    callbackURL: '/',
  })
}
