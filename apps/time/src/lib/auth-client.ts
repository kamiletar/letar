'use client'

import { type AuthClientWithOAuth, createAuthClientWithOAuth, createSignInWithLetarAuth } from '@letar/auth/client'

/**
 * Клиент авторизации для time
 *
 * Использует genericOAuth для входа через ключницу (letar-auth)
 */
export const authClient: AuthClientWithOAuth = createAuthClientWithOAuth()

export const { useSession, signOut } = authClient

/**
 * Войти через ключницу. Если callbackURL не передан — используется текущая страница.
 */
export const signInWithLetarAuth = createSignInWithLetarAuth(authClient)
