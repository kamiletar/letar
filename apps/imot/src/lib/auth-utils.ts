'use server'

import type { UserRole } from '@/generated/prisma'
import { createAuthChecks, createAuthGuards, createSessionHelpers } from '@letar/auth/server'
import { redirect } from 'next/navigation'
import { auth } from './auth-config'
import type { SessionWithRole, UserWithRole } from './auth.types'

// Создаём хелперы из библиотеки
const { getSession: _getSession, getCurrentUser: _getCurrentUser } = createSessionHelpers<
  SessionWithRole,
  UserWithRole
>(auth)

const { requireAuth: _requireAuth, requireRole: _requireRole } = createAuthGuards<SessionWithRole, UserWithRole>(
  _getSession,
  (session) => session.user
)

const { hasRole: _hasRole, isAdmin: _isAdmin } = createAuthChecks(_getCurrentUser)

// Экспорт с типами IMOT
export const getSession = _getSession
export const getCurrentUser = _getCurrentUser

/**
 * Требовать аутентификацию — редирект на /sign-in
 */
export async function requireAuth(): Promise<UserWithRole> {
  const { user } = await _requireAuth({ redirectTo: '/sign-in' })
  return user
}

/**
 * Требовать определённую роль — редирект на /dashboard при несовпадении
 */
export async function requireRole(role: UserRole | UserRole[]): Promise<UserWithRole> {
  // Сначала requireAuth с редиректом на /sign-in
  await _requireAuth({ redirectTo: '/sign-in' })
  // Потом проверка роли с редиректом на /dashboard
  const { user } = await _requireRole(role, { redirectTo: '/dashboard' })
  return user
}

export const hasRole = _hasRole
export const isAdmin = _isAdmin

/**
 * Проверка, является ли пользователь клиентом
 */
export async function isClient(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === 'CLIENT'
}

/**
 * Проверка, является ли пользователь специалистом
 */
export async function isSpecialist(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === 'SPECIALIST'
}

/**
 * Требовать заполненный профиль клиента
 * Если профиля нет или запрос не заполнен - редирект на /draft-request
 * Использовать в страницах CLIENT, которые требуют заполненный профиль
 */
export async function requireClientProfile(userId: string) {
  const { prisma } = await import('@/lib/db')

  const clientProfile = await prisma.client.findUnique({
    where: { userId },
    select: {
      id: true,
      mainRequest: true,
    },
  })

  if (!clientProfile || !clientProfile.mainRequest) {
    redirect('/draft-request')
  }

  return clientProfile
}
