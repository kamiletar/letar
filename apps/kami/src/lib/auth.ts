import type { UserRole } from '@/generated/prisma'
import { createRedisStorage } from '@letar/auth/server'
import { sendInvitationEmail } from '@letar/email'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { genericOAuth, organization } from 'better-auth/plugins'
import { prisma } from './prisma'

/**
 * Better Auth конфигурация для Kami
 *
 * Авторизация — ТОЛЬКО через Ключницу (auth.letar.best) по OIDC.
 * Прямые провайдеры (email/password, magic link, GitHub, Google, Facebook, VK, Yandex)
 * — убраны из kami, все они доступны на Ключнице.
 *
 * Плагины:
 * - genericOAuth / letar-auth — OIDC клиент Ключницы
 * - organization — командные опросы и HireRequest
 * - nextCookies — совместимость с Next.js 16 Server Actions
 */
export const auth = betterAuth({
  // Явное указание secret (best practice)
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Redis secondaryStorage для rate-limit (Этап 0.2 PLAN.md).
  // В dev REDIS_URL не задан → Better Auth fallback на memory.
  ...(process.env.REDIS_URL && { secondaryStorage: createRedisStorage(process.env.REDIS_URL) }),

  // Base URL для генерации callback URLs
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3005',

  // Доверенные домены
  trustedOrigins: [
    'http://localhost:3005',
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ],

  // Плагины
  plugins: [
    nextCookies(),

    // Ключница (auth.letar.best) — единственный способ входа в kami
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

    // Organization plugin для командных опросов и HireRequest
    organization({
      // Любой авторизованный пользователь может создать организацию
      allowUserToCreateOrganization: true,

      // Email-приглашения в команду
      sendInvitationEmail: async (data) => {
        const baseUrl = process.env.BETTER_AUTH_URL || 'http://localhost:3005'
        const inviteUrl = `${baseUrl}/accept-invitation/${data.id}`

        await sendInvitationEmail({
          to: data.email,
          inviterName: data.inviter.user.name || data.inviter.user.email,
          organizationName: data.organization.name,
          inviteUrl,
        })
      },

      onInvitationAccepted: async (data: {
        id: string
        role: string
        organization: { id: string; name: string; slug: string }
        invitation: { id: string; email: string }
        inviter: { user: { id: string; name: string | null; email: string } }
        acceptedUser: { id: string; name: string | null; email: string }
      }) => {
        // eslint-disable-next-line no-console -- Логирование событий организации
        console.info(`[Organization] ${data.acceptedUser.email} joined ${data.organization.name}`)
      },
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
      roles: {
        type: 'string[]',
        defaultValue: ['USER'],
        required: false,
      },
    },
  },

  // Rate limiting
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    storage: process.env.REDIS_URL
      ? 'secondary-storage'
      : process.env.NODE_ENV === 'production'
      ? 'database'
      : 'memory',
    modelName: 'rateLimit',
    customRules: {
      // Организации
      '/organization/*': {
        window: 60,
        max: 30,
      },
    },
  },

  // Автоматическая привязка аккаунтов Ключницы с тем же email
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['letar-auth'],
    },
  },

  // Advanced настройки
  advanced: {
    ipAddress: {
      ipAddressHeaders: ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'],
    },
  },

  // Страницы
  pages: {
    signIn: '/sign-in',
    error: '/sign-in',
  },
})

// Экспорт типов
export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user

/**
 * Расширенный тип пользователя с ролями
 */
export interface UserWithRoles {
  id: string
  name: string | null
  email: string
  emailVerified: boolean
  image?: string | null
  createdAt: Date
  updatedAt: Date
  roles: UserRole[]
}

export interface SessionWithRoles {
  session: {
    id: string
    userId: string
    token: string
    expiresAt: Date
    ipAddress?: string | null
    userAgent?: string | null
    createdAt: Date
    updatedAt: Date
  }
  user: UserWithRoles
}

/**
 * Получить текущую сессию
 */
export async function getSession(): Promise<SessionWithRoles | null> {
  const { headers } = await import('next/headers')
  const session = await auth.api.getSession({ headers: await headers() })
  return session as SessionWithRoles | null
}

/**
 * Получить текущего пользователя
 */
export async function getCurrentUser(): Promise<UserWithRoles | null> {
  const session = await getSession()
  return session?.user ?? null
}

/**
 * Проверить, имеет ли пользователь роль
 *
 * Если roles из сессии недоступен (cookieCache может не включать additionalFields),
 * подтягиваем роли из БД напрямую.
 */
export async function hasRole(role: UserRole | UserRole[]): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) {
    return false
  }

  // cookieCache может не включать roles — подтягиваем из БД
  let userRoles = user.roles
  if (!Array.isArray(userRoles) || userRoles.length === 0) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { roles: true },
    })
    userRoles = dbUser?.roles ?? []
  }

  const targetRoles = Array.isArray(role) ? role : [role]
  return targetRoles.some((r) => userRoles.includes(r))
}

/**
 * Проверить, является ли пользователь админом
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole('ADMIN')
}
