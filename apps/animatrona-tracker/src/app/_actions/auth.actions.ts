'use server'

import { auth } from '@/lib/auth-config'
import { createLogoutAction } from '@letar/auth/server'

/**
 * Server Action для выхода из системы.
 *
 * RP-Initiated Logout: очищает локальную Better Auth сессию, затем редиректит
 * на end_session_endpoint Ключницы. Если пользователь входил через Ключницу — её сессия
 * тоже очищается. Если через другой провайдер — auth-hub просто возвращает на /sign-in.
 */
export const logoutAction = createLogoutAction(auth, {
  oidcLogout: {
    endSessionUrl: `${process.env.BETTER_AUTH_OIDC_ISSUER}/api/auth/oauth2/endsession`,
    clientId: process.env.OIDC_CLIENT_ID!,
    postLogoutRedirectUri: `${process.env.BETTER_AUTH_URL}/sign-in`,
  },
})
