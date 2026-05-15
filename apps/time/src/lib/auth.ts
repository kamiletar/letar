import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'
import { genericOAuth } from 'better-auth/plugins'

/**
 * Better Auth конфигурация для time
 *
 * Авторизация через ключницу (auth.letar.best) по OIDC.
 * Локальной БД для auth нет — используется только cookie сессия.
 */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,

  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3013',

  trustedOrigins: ['http://localhost:3013', ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [])],

  plugins: [
    nextCookies(),

    // Подключение к ключнице через OIDC
    genericOAuth({
      config:
        process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET
          ? [
              {
                providerId: 'letar-auth',
                discoveryUrl:
                  process.env.OIDC_DISCOVERY_URL || 'https://auth.letar.best/api/auth/.well-known/openid-configuration',
                clientId: process.env.OIDC_CLIENT_ID,
                clientSecret: process.env.OIDC_CLIENT_SECRET,
                scopes: ['openid', 'profile', 'email'],
                pkce: true,
              },
            ]
          : [],
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 дней
    updateAge: 60 * 60 * 24, // Обновлять раз в день
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 минут
    },
  },

  pages: {
    signIn: '/sign-in',
  },
})

// Экспорт типов
export type Session = typeof auth.$Infer.Session

/**
 * Получить текущую сессию
 */
export async function getSession(): Promise<Session | null> {
  const { headers } = await import('next/headers')
  return auth.api.getSession({ headers: await headers() })
}

/**
 * Получить текущего пользователя
 */
export async function getCurrentUser() {
  const session = await getSession()
  return session?.user ?? null
}

/**
 * Требует авторизации, иначе редирект
 */
export async function requireAuth(): Promise<Session> {
  const { redirect } = await import('next/navigation')
  const session = await getSession()
  if (!session) {
    redirect('/sign-in')
  }
  return session as Session
}
