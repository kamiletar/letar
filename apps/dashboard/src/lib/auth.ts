/* eslint-disable no-console -- Auth debugging requires console output */

import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { genericOAuth, username } from 'better-auth/plugins'

import type { UserRole } from './auth.types'
import { prismaAuth } from './prisma'

/**
 * Better Auth instance для Dashboard
 *
 * Особенности:
 * - PostgreSQL через Prisma adapter
 * - Пользователи seeded из env переменных при первом запуске
 * - Username plugin для входа по username
 * - Stateless сессии через cookie cache
 */
export const auth = betterAuth({
  // Явное указание secret и baseURL (best practice)
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  database: prismaAdapter(prismaAuth, {
    provider: 'postgresql',
  }),

  // Email/Password аутентификация
  emailAndPassword: {
    enabled: true,
    // Отключаем регистрацию — только seed пользователи
  },

  // Плагины: username, cookie, ключница (OIDC)
  plugins: [
    username(),
    nextCookies(),
    genericOAuth({
      config: process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET
        ? [
          {
            providerId: 'letar-auth',
            discoveryUrl: process.env.OIDC_DISCOVERY_URL
              || 'https://auth.letar.best/api/auth/.well-known/openid-configuration',
            clientId: process.env.OIDC_CLIENT_ID,
            clientSecret: process.env.OIDC_CLIENT_SECRET,
            scopes: ['openid', 'profile', 'email'],
            pkce: true,
          },
        ]
        : [],
    }),
  ],

  // Привязка OAuth аккаунтов по email
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['letar-auth'],
    },
  },

  // Stateless сессии (cookie-based)
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 7 * 24 * 60 * 60, // 7 дней
      strategy: 'jwt',
    },
  },

  // Кастомные поля пользователя
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'USER',
      },
      username: {
        type: 'string',
        required: false,
      },
    },
  },

  // Rate limiting
  rateLimit: {
    window: 60,
    max: 100,
    customRules: {
      '/sign-in/*': { window: 900, max: 5 },
      '/oauth2/*': { window: 60, max: 30 },
    },
  },

  // Страница входа
  pages: {
    signIn: '/auth/signin',
  },
})

/**
 * Seed пользователей из env переменных
 *
 * Вызывается при импорте модуля (т.е. при старте сервера)
 * Проверяет существование пользователей в БД и создаёт их если нужно
 */
async function seedUsers() {
  const adminUsername = process.env.DASHBOARD_ADMIN_USERNAME
  const adminPassword = process.env.DASHBOARD_ADMIN_PASSWORD
  const viewerUsername = process.env.DASHBOARD_VIEWER_USERNAME
  const viewerPassword = process.env.DASHBOARD_VIEWER_PASSWORD

  if (!adminUsername || !adminPassword) {
    console.warn('[Dashboard Auth] DASHBOARD_ADMIN_USERNAME/PASSWORD not set, skipping admin seed')
    return
  }

  try {
    // Проверяем существует ли admin
    const adminEmail = `${adminUsername}@dashboard.local`
    const existingAdmin = await prismaAuth.user.findUnique({
      where: { email: adminEmail },
      select: { id: true, role: true },
    })

    if (!existingAdmin) {
      // Создаём admin через Better Auth API
      const ctx = await auth.api.signUpEmail({
        body: {
          email: adminEmail,
          password: adminPassword,
          name: 'Admin',
          username: adminUsername,
        },
        headers: new Headers(),
      })

      // Устанавливаем роль ADMIN
      if (ctx?.user?.id) {
        await prismaAuth.user.update({
          where: { id: ctx.user.id },
          data: { role: 'ADMIN' },
        })
        console.log('[Dashboard Auth] Admin user seeded successfully')
      }
    } else if (existingAdmin.role !== 'ADMIN') {
      // Если пользователь существует, но не ADMIN — обновляем роль
      await prismaAuth.user.update({
        where: { id: existingAdmin.id },
        data: { role: 'ADMIN' },
      })
      console.log('[Dashboard Auth] Admin user role updated to ADMIN')
    }

    // Seed viewer если указан
    if (viewerUsername && viewerPassword) {
      const viewerEmail = `${viewerUsername}@dashboard.local`
      const existingViewer = await prismaAuth.user.findUnique({
        where: { email: viewerEmail },
      })

      if (!existingViewer) {
        const ctx = await auth.api.signUpEmail({
          body: {
            email: viewerEmail,
            password: viewerPassword,
            name: 'Viewer',
            username: viewerUsername,
          },
          headers: new Headers(),
        })

        // Роль VIEWER по умолчанию
        if (ctx?.user?.id) {
          console.log('[Dashboard Auth] Viewer user seeded successfully')
        }
      }
    }
  } catch (error) {
    console.error('[Dashboard Auth] Error seeding users:', error)
  }
}

// Seed при импорте (асинхронно, не блокирует запуск)
seedUsers()

// Типизированные хелперы
export type Auth = typeof auth

/**
 * Получить сессию на сервере
 */
export async function getServerSession() {
  const { headers } = await import('next/headers')
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user) {
    console.log('[getServerSession] No session found')
    return null
  }

  console.log('[getServerSession] Session user:', {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  })

  // Получаем role из БД
  const user = await prismaAuth.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  console.log('[getServerSession] DB user role:', user?.role, '| User found:', !!user)

  return {
    user: {
      ...session.user,
      role: (user?.role || 'VIEWER') as UserRole,
      username: session.user.name, // Better Auth хранит username в name при использовании username plugin
    },
    session: session.session,
  }
}
