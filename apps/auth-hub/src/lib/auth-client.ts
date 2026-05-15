'use client'

import type { UserRole } from '@/generated/prisma'
import { createAuthClientWithOAuth, createOAuthButtons, createTypedUseSession } from '@letar/auth/client'
import { magicLinkClient } from 'better-auth/client/plugins'

/**
 * Better Auth клиент для Ключницы
 *
 * Использует createAuthClientWithOAuth для поддержки genericOAuth (Yandex)
 */
export const authClient = createAuthClientWithOAuth({
  plugins: [magicLinkClient()],
})

export const { signIn, signOut, signUp } = authClient

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
  user: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image?: string | null
    createdAt: Date
    updatedAt: Date
    roles: UserRole[]
  }
}

export const useSession = createTypedUseSession<SessionWithRoles>(authClient)

export const OAuthButtons = createOAuthButtons(authClient)
