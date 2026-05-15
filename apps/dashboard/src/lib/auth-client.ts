'use client'

import { type AuthClientWithOAuth, createAuthClientWithOAuth } from '@letar/auth/client'
import { usernameClient } from 'better-auth/client/plugins'

/**
 * Better Auth клиент для Dashboard
 *
 * Используется в клиентских компонентах для:
 * - useSession() - получение текущей сессии
 * - signIn.username() - вход по username
 * - signIn.oauth2() - вход через Ключницу
 * - signOut() - выход
 */
export const authClient: AuthClientWithOAuth = createAuthClientWithOAuth({
  plugins: [usernameClient()],
})

// Экспортируем хуки и методы
export const { useSession, signIn, signOut, getSession } = authClient

/**
 * Войти через ключницу (auth.letar.best)
 */
export async function signInWithLetarAuth(callbackURL = '/') {
  return authClient.signIn.oauth2({
    providerId: 'letar-auth',
    callbackURL,
  })
}

// Типы для совместимости
export type Session = typeof authClient.$Infer.Session
