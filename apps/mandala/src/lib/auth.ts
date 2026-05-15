/**
 * Better Auth конфигурация для Mandala
 *
 * Особенности:
 * - Prisma adapter для PostgreSQL
 * - OAuth: Google, Yandex
 * - Email/password аутентификация
 * - Роли: USER, ADMIN
 * - Session-based auth с cookie caching
 *
 * НЕ использует 'use server' — экспортирует объект auth и утилиты.
 */

import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { genericOAuth } from 'better-auth/plugins'
import { cache } from 'react'
import { prisma } from './db'
import type { SessionWithRole, UserWithRole } from './types/auth.types'

export const auth = betterAuth({
  // Явное указание secret и baseURL (best practice)
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Email/Password auth
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },

  // OAuth провайдеры
  socialProviders: {
    // Google OAuth
    ...(process.env.AUTH_GOOGLE_ID &&
      process.env.AUTH_GOOGLE_SECRET && {
        google: {
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        },
      }),
  },

  // Плагины
  plugins: [
    nextCookies(),
    // genericOAuth для Yandex
    genericOAuth({
      config: [
        {
          providerId: 'yandex',
          clientId: process.env.AUTH_YANDEX_ID || '',
          clientSecret: process.env.AUTH_YANDEX_SECRET || '',
          discoveryUrl: 'https://oauth.yandex.ru/.well-known/openid-configuration',
          scopes: ['login:email', 'login:info', 'login:avatar'],
        },
      ],
    }),
  ],

  // Настройки сессии
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 дней
    updateAge: 60 * 60 * 24, // Обновлять каждый день
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // Кэширование cookie на 5 минут
    },
  },

  // Кастомные поля пользователя
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'USER',
        required: false,
      },
    },
  },

  // Rate limiting
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
    customRules: {
      '/sign-in/*': {
        window: 900,
        max: 5,
      },
      '/sign-up/*': {
        window: 3600,
        max: 3,
      },
    },
  },

  // Страницы
  pages: {
    signIn: '/sign-in',
    signUp: '/sign-up',
    error: '/sign-in',
  },
})

// Экспорт типов
export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user

// Реэкспорт общих типов из единого источника
export type { SessionWithRole, UserWithRole } from './types/auth.types'

/**
 * Получить текущую сессию.
 * Обёрнуто в React cache() для дедупликации запросов в рамках одного request cycle.
 * Без cache() каждый вызов getSession() = 2 DB запроса (Better Auth + role lookup).
 */
export const getSession = cache(async (): Promise<SessionWithRole | null> => {
  const { headers } = await import('next/headers')
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session?.user) {
    return null
  }

  // Обогащаем данные из БД
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
    },
  })

  if (!dbUser) {
    return null
  }

  return {
    ...session,
    user: {
      ...session.user,
      role: dbUser.role,
    },
  } as SessionWithRole
})

/**
 * Получить текущего пользователя
 */
export async function getCurrentUser(): Promise<UserWithRole | null> {
  const session = await getSession()
  return session?.user ?? null
}

/**
 * Проверить, является ли пользователь администратором
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.role === 'ADMIN'
}

/**
 * Guard для защиты server actions/pages — требует авторизации
 */
export async function requireAuth(): Promise<SessionWithRole> {
  const session = await getSession()
  if (!session) {
    throw new Error('UNAUTHORIZED')
  }
  return session
}

/**
 * Guard для защиты admin actions/pages — требует роль ADMIN
 */
export async function requireAdmin(): Promise<SessionWithRole> {
  const session = await requireAuth()
  if (session.user.role !== 'ADMIN') {
    throw new Error('FORBIDDEN')
  }
  return session
}
