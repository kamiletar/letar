'use client'

import { createAuthClient, createTypedUseSession } from '@letar/auth/client'
import type { SessionWithRole } from './auth.types'

/**
 * Better Auth Client для IMOT
 *
 * Клиентский SDK для взаимодействия с Better Auth.
 * Используется в React компонентах для:
 * - Получения сессии (useSession)
 * - Входа/выхода (signIn, signOut)
 * - Регистрации (signUp)
 */
export const authClient = createAuthClient()

// Экспортируем хуки и методы
export const { signIn, signOut, signUp, getSession } = authClient

/**
 * Типизированный useSession с поддержкой роли
 */
export const useSession = createTypedUseSession<SessionWithRole>(authClient)
