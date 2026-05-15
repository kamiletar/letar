'use client'

import {
  type AuthClientWithOAuth,
  createAuthClientWithOAuth,
  createOAuthButtons,
  createTypedUseSession,
} from '@letar/auth/client'
import type { SessionWithRole } from './types/auth.types'

/**
 * Better Auth клиент для Mandala
 *
 * Используется в клиентских компонентах для:
 * - useSession() - получение текущей сессии
 * - signIn.social() - вход через OAuth (Google)
 * - signIn.oauth2() - вход через Yandex (genericOAuth)
 * - signOut() - выход
 */
export const authClient: AuthClientWithOAuth = createAuthClientWithOAuth()

// Экспортируем хуки и методы
export const { signIn, signOut, signUp } = authClient

// Реэкспорт общих типов из единого источника
export type { SessionWithRole, UserWithRole } from './types/auth.types'

/**
 * Типизированный useSession с поддержкой роли
 */
export const useSession = createTypedUseSession<SessionWithRole>(authClient)

/**
 * OAuth кнопки для входа/регистрации
 * Поддерживает Google и Яндекс
 */
export const OAuthButtons = createOAuthButtons(authClient)
