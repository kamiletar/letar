'use client'

import type { UserRole } from '@/generated/prisma'
import { createTypedUseSession } from '@letar/auth/client'
import { genericOAuthClient, organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

/**
 * Better Auth клиент для Kami
 *
 * Авторизация — ТОЛЬКО через Ключницу (auth.letar.best).
 * Для входа используй signInWithLetarAuth().
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [genericOAuthClient(), organizationClient()],
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
