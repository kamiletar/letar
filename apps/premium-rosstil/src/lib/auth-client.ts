'use client'

import { createAuthClientWithOAuth, createOAuthButtons, createTypedUseSession } from '@letar/auth/client'
import type { SessionWithRole } from './auth'

/**
 * Better Auth React client для Premium Rosstil
 *
 * Для Yandex OAuth используй: signIn.oauth2({ providerId: 'yandex' })
 * Для Google OAuth используй: signIn.social({ provider: 'google' })
 */
export const authClient = createAuthClientWithOAuth()

// Экспортируем хуки и методы
export const { signIn, signOut, signUp } = authClient

/**
 * Типизированный useSession с поддержкой роли
 */
export const useSession = createTypedUseSession<SessionWithRole>(authClient)

/**
 * OAuth кнопки для авторизации
 */
export const OAuthButtons = createOAuthButtons(authClient)
