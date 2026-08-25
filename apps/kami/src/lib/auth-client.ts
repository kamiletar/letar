'use client'

import type { UserRole } from '@/generated/prisma'
import { createAuthClientWithOAuth, createSignInWithLetarAuth, createTypedUseSession } from '@letar/auth/client'
import { organizationClient } from 'better-auth/client/plugins'

/**
 * Better Auth клиент для Kami
 *
 * Авторизация — ТОЛЬКО через Ключницу (auth.letar.best).
 * Для входа используй signInWithLetarAuth().
 *
 * Better Auth 1.7+ убрал genericOAuthClient() — вход через провайдер `letar-auth`
 * теперь идёт через signIn.social(), обёрнутый createAuthClientWithOAuth() в
 * совместимый signIn.oauth2() (см. .claude/docs/better-auth-1.7-oidc-provider-removed.md).
 */
export const authClient = createAuthClientWithOAuth({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [organizationClient()],
  fetchOptions: {
    onError: async (context) => {
      const { response } = context
      if (response.status === 429) {
        const retryAfter = response.headers.get('X-Retry-After')
        console.warn(`[Auth] Rate limit exceeded. Retry after ${retryAfter || '?'} seconds.`)
      }
    },
  },
})

export const { signIn, signOut } = authClient

/**
 * Войти через Ключницу (auth.letar.best) — единственный способ авторизации.
 */
export const signInWithLetarAuth = createSignInWithLetarAuth(authClient, { defaultCallbackURL: '/' })

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
