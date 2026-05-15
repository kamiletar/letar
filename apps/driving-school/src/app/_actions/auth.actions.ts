'use server'

import { auth } from '@/lib/auth'
import { createLogoutAction } from '@letar/auth/server'

/**
 * Server action для выхода из системы.
 * Перенаправляет на /sign-in после выхода.
 */
export const logoutAction = createLogoutAction(auth, { redirectTo: '/sign-in' })
