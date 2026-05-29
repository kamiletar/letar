'use server'

import { auth } from '@/lib/auth'
import { createLogoutAction } from '@letar/auth/server'

/**
 * Server Action для выхода из системы.
 *
 * Выполняет RP-Initiated Logout:
 * 1. Очищает локальную Better Auth сессию
 * 2. Редиректит на end_session_endpoint Ключницы
 * 3. Ключница очищает OIDC сессию и возвращает на главную
 */
export const logoutAction = createLogoutAction(auth, {
  oidcLogout: {
    endSessionUrl: `${process.env.BETTER_AUTH_OIDC_ISSUER}/api/auth/oauth2/endsession`,
    clientId: process.env.OIDC_CLIENT_ID!,
    postLogoutRedirectUri: `${process.env.BETTER_AUTH_URL}/`,
  },
})
