import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { genericOAuth } from 'better-auth/plugins'
import { prisma } from './prisma'

/**
 * Better Auth конфигурация для archetest
 *
 * Авторизация через ключницу (auth.letar.best) по OIDC.
 * Используется локальная БД для хранения сессий и OAuth state.
 */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3012',

  trustedOrigins: ['http://localhost:3012', ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [])],

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

  user: {
    additionalFields: {
      roles: {
        type: 'string[]',
        defaultValue: ['USER'],
        input: false,
      },
    },
  },

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
 * Получить пользователя для ZenStack access control.
 * Better Auth не включает roles в сессию по умолчанию,
 * поэтому подгружаем из БД.
 */
export async function getDbUser(session: Session) {
  const { prisma: db } = await import('./db')
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, roles: true },
  })
  return user ?? { id: session.user.id, roles: [] as ('USER' | 'ADMIN' | 'PSYCHOLOGIST')[] }
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
