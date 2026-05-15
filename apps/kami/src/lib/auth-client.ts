'use client'

import type { UserRole } from '@/generated/prisma'
import { createOAuthButtons, createTypedUseSession } from '@letar/auth/client'
import { genericOAuthClient, magicLinkClient, organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

/**
 * Better Auth клиент для Kami
 *
 * Используется в клиентских компонентах для:
 * - useSession() - получение текущей сессии с типизацией
 * - signIn.social() - вход через OAuth (GitHub, Google)
 * - signIn.oauth2() - вход через Yandex (genericOAuth)
 * - signIn.magicLink() - вход по magic link
 * - signOut() - выход
 * - OAuthButtons - готовые кнопки OAuth
 * - organization.* - управление организациями и командами
 *
 * Rate Limiting:
 * - Глобально обрабатывает 429 ошибки
 * - X-Retry-After header показывает время до следующего запроса
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [genericOAuthClient(), magicLinkClient(), organizationClient()],
  fetchOptions: {
    // Глобальная обработка rate limit ошибок
    onError: async (context) => {
      const { response } = context
      if (response.status === 429) {
        const retryAfter = response.headers.get('X-Retry-After')
        console.warn(`[Auth] Rate limit exceeded. Retry after ${retryAfter || '?'} seconds.`)
        // Можно добавить toast уведомление или другую логику
      }
    },
  },
})

// Экспортируем хуки и методы
export const { signIn, signOut, signUp } = authClient

/**
 * Войти через ключницу (auth.letar.best)
 */
export async function signInWithLetarAuth(callbackURL = '/') {
  return authClient.signIn.oauth2({
    providerId: 'letar-auth',
    callbackURL,
  })
}

/**
 * Расширенный тип пользователя с ролями
 */
export interface UserWithRoles {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  createdAt: Date
  updatedAt: Date
  roles: UserRole[]
}

/**
 * Расширенный тип сессии с ролями
 */
export interface SessionWithRoles {
  session: {
    id: string
    userId: string
    token: string
    expiresAt: Date
    ipAddress?: string | null
    userAgent?: string | null
    createdAt: Date
    updatedAt: Date
  }
  user: UserWithRoles
}

/**
 * Типизированный useSession с поддержкой ролей
 */
export const useSession = createTypedUseSession<SessionWithRoles>(authClient)

/**
 * OAuth кнопки для авторизации
 */
export const OAuthButtons = createOAuthButtons(authClient)
