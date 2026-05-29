'use server'

import { auth } from '@/lib/auth-config'
import { createLogoutAction } from '@letar/auth/server'

/**
 * Server Action для выхода из системы.
 *
 * Animatrona Tracker — гибридное приложение с собственной БД и Ключницей как опциональным провайдером.
 * Просто очищаем локальную Better Auth сессию и редиректим на /sign-in.
 */
export const logoutAction = createLogoutAction(auth, {
  redirectTo: '/sign-in',
})
