'use client'

import { type AuthClientWithOAuth, createAuthClientWithOAuth } from '@letar/auth/client'

/**
 * Better Auth клиент для клиентских компонентов
 *
 * Использование:
 * import { authClient, useSession, signIn, signOut } from '@/lib/auth-client'
 */
export const authClient: AuthClientWithOAuth = createAuthClientWithOAuth()

export const { useSession, signIn, signUp, signOut } = authClient

/**
 * Войти через ключницу (auth.letar.best).
 *
 * Если callbackURL не передан — автоматически используется текущий URL страницы
 * (pathname + search), чтобы после логина пользователь вернулся ровно туда,
 * откуда кликнул «Войти». Передача явного значения перекрывает этот дефолт.
 */
export async function signInWithLetarAuth(callbackURL?: string) {
  const target = callbackURL
    ?? (typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/')
  return authClient.signIn.oauth2({
    providerId: 'letar-auth',
    callbackURL: target,
  })
}
