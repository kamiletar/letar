'use client'

import { createOAuthButtons, createTypedUseSession } from '@letar/auth/client'
import type { UserRole } from '@letar/driving-school-db/prisma'
import { genericOAuthClient, organizationClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'
import { ac, roles } from './permissions'

/**
 * Better Auth клиент для Driving School
 *
 * Используется в клиентских компонентах для:
 * - useSession() - получение текущей сессии
 * - signIn.social() - вход через OAuth (Google)
 * - signIn.oauth2() - вход через Yandex (genericOAuth)
 * - signOut() - выход
 * - organization.* - управление организациями (школами)
 */
export const authClient = createAuthClient({
  // Явно указываем baseURL в punycode формате для корректной работы OAuth
  // Браузер может показывать кириллицу (направа.рф), но OAuth требует punycode
  baseURL: 'https://xn--80aaah6cnh.xn--p1ai',
  plugins: [
    genericOAuthClient(),
    organizationClient({
      ac,
      roles,
    }),
  ],
})

// Экспортируем хуки и методы
export const { signIn, signOut, signUp, organization } = authClient

/**
 * Хуки для работы с организациями (школами)
 */
export const { useActiveOrganization, useListOrganizations } = authClient

/**
 * Расширенный тип пользователя
 */
export interface UserWithExtras {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
  createdAt: Date
  updatedAt: Date
  roles: UserRole[]
  isOnboardingComplete: boolean
  hasStudentProfile?: boolean
  hasInstructorProfile?: boolean
}

/**
 * Расширенный тип сессии
 */
export interface SessionWithExtras {
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
  user: UserWithExtras
}

/**
 * Типизированный useSession с поддержкой кастомных полей
 */
export const useSession = createTypedUseSession<SessionWithExtras>(authClient)

/**
 * OAuth кнопки для входа/регистрации
 * Поддерживает Google и Yandex
 */
export const OAuthButtons = createOAuthButtons(authClient)
