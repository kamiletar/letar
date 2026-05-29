'use server'

import { auth } from '@/lib/auth'
import { createLogoutAction } from '@letar/auth/server'

/**
 * Server Action для выхода из системы.
 *
 * Kami — standalone Better Auth, не является OIDC-клиентом Ключницы,
 * поэтому просто очищаем локальную сессию и редиректим на /sign-in.
 *
 * @example
 * // В клиентском компоненте
 * <form action={logoutAction}>
 *   <Button type="submit">Выйти</Button>
 * </form>
 */
export const logoutAction = createLogoutAction(auth, {
  redirectTo: '/sign-in',
})
