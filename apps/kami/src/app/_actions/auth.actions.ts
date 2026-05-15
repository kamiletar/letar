'use server'

import { auth } from '@/lib/auth'
import { createLogoutAction } from '@letar/auth/server'

/**
 * Server Action для выхода из системы
 *
 * Использует shared библиотеку @letar/auth для консистентности
 * между всеми приложениями в монорепо.
 *
 * @example
 * // В клиентском компоненте
 * <form action={logoutAction}>
 *   <Button type="submit">Выйти</Button>
 * </form>
 */
export const logoutAction = createLogoutAction(auth)
