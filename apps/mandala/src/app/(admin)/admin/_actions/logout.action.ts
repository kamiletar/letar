'use server'

import { auth } from '@/lib/auth'
import { createLogoutAction } from '@letar/auth/server'

/**
 * Server action для выхода из админ-панели
 */
export const logoutAction = createLogoutAction(auth)
