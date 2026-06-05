import type { UserRole } from '@/generated/prisma'
import { createRedisStorage } from '@letar/auth/server'
import { reportEmailFailure, sendMagicLinkEmail, sendVerificationEmail } from '@letar/email'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { genericOAuth, magicLink } from 'better-auth/plugins'
import { oidcProvider } from 'better-auth/plugins/oidc-provider'
import { passkeyPlugin } from './passkey/plugin'
import { prisma } from './prisma'

/**
 * Ключница — централизованный сервис авторизации
 *
 * Better Auth + OIDC Provider:
 * - OAuth: GitHub, Google, Facebook, VK, Yandex (настроены один раз)
 * - Email/password с верификацией
 * - Magic Link
 * - OIDC Provider — выдаёт токены для клиентских приложений
 */

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Redis secondaryStorage для rate-limit и сессионного кэша (Этап 0.2 PLAN.md).
  // В dev REDIS_URL не задан → Better Auth fallback на memory.
  ...(process.env.REDIS_URL && { secondaryStorage: createRedisStorage(process.env.REDIS_URL) }),

  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3014',

  trustedOrigins: [
    'http://localhost:3014',
    'http://localhost:3012', // archetest
    // Все клиентские приложения
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(',').map((s) => s.trim()) : []),
  ],

  // Email/Password
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: process.env.NODE_ENV === 'production',
  },

  // Email верификация
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // Захватываем SendEmailResult — при провале SMTP централизованно логируем
      // (первопричина PLAN.md: письма молча не доходили). См. @letar/email reportEmailFailure.
      const result = await sendVerificationEmail({
        to: user.email,
        userName: user.name ?? undefined,
        verificationUrl: url,
      })
      if (!result.success) {
        reportEmailFailure({
          type: 'verification',
          to: user.email,
          error: result.error ?? 'unknown',
        })
      }
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },

  // OAuth провайдеры (настроены ОДИН РАЗ для всех приложений)
  socialProviders: {
    // GitHub
    ...(process.env.AUTH_GITHUB_ID
      && process.env.AUTH_GITHUB_SECRET && {
      github: {
        clientId: process.env.AUTH_GITHUB_ID,
        clientSecret: process.env.AUTH_GITHUB_SECRET,
      },
    }),

    // Google
    ...(process.env.AUTH_GOOGLE_ID
      && process.env.AUTH_GOOGLE_SECRET && {
      google: {
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      },
    }),

    // Facebook
    ...(process.env.AUTH_FACEBOOK_ID
      && process.env.AUTH_FACEBOOK_SECRET && {
      facebook: {
        clientId: process.env.AUTH_FACEBOOK_ID,
        clientSecret: process.env.AUTH_FACEBOOK_SECRET,
      },
    }),

    // VK (ВКонтакте)
    ...(process.env.AUTH_VK_ID
      && process.env.AUTH_VK_SECRET && {
      vk: {
        clientId: process.env.AUTH_VK_ID,
        clientSecret: process.env.AUTH_VK_SECRET,
        getUserInfo: async (tokens) => {
          const userId = (tokens.raw as { user_id?: number })?.user_id
          const response = await fetch(
            `https://api.vk.com/method/users.get?user_ids=${userId}&fields=photo_200,screen_name&access_token=${tokens.accessToken}&v=5.131`,
          )
          const data = await response.json()
          const user = data.response?.[0]

          if (!user) {
            throw new Error('VK user not found')
          }

          const email = (tokens.raw as { email?: string })?.email

          return {
            user: {
              id: String(user.id),
              name: `${user.first_name} ${user.last_name}`.trim() || user.screen_name,
              email: email || `${user.id}@vk.com`,
              image: user.photo_200,
              emailVerified: !!email,
            },
            data: user,
          }
        },
      },
    }),
  },

  // Плагины
  // ⚠️ nextCookies() ОБЯЗАН быть последним — иначе плагины после него
  // не могут устанавливать куки и крашат с "Cookies can only be modified
  // in a Server Action or Route Handler" (особенно oidcProvider).
  plugins: [
    // Magic Link
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const user = await prisma.user.findUnique({
          where: { email },
          select: { name: true },
        })

        await sendMagicLinkEmail({
          to: email,
          userName: user?.name ?? undefined,
          magicLinkUrl: url,
        })
      },
      expiresIn: 900, // 15 минут
      disableSignUp: false,
    }),

    // Yandex через genericOAuth
    genericOAuth({
      config: process.env.AUTH_YANDEX_ID && process.env.AUTH_YANDEX_SECRET
        ? [
          {
            providerId: 'yandex',
            clientId: process.env.AUTH_YANDEX_ID,
            clientSecret: process.env.AUTH_YANDEX_SECRET,
            authorizationUrl: 'https://oauth.yandex.ru/authorize',
            tokenUrl: 'https://oauth.yandex.ru/token',
            scopes: ['login:email', 'login:info', 'login:avatar'],
            getUserInfo: async (tokens) => {
              const response = await fetch('https://login.yandex.ru/info', {
                headers: {
                  Authorization: `OAuth ${tokens.accessToken}`,
                },
              })
              const data = await response.json()
              return {
                id: data.id,
                name: data.display_name || data.real_name || data.login,
                email: data.default_email,
                image: data.default_avatar_id
                  ? `https://avatars.yandex.net/get-yapic/${data.default_avatar_id}/islands-200`
                  : undefined,
                emailVerified: true,
              }
            },
          },
        ]
        : [],
    }),

    // OIDC Provider — ключница выдаёт токены клиентским приложениям.
    // Клиенты хранятся в таблице oauthApplication (БД), не в коде.
    // Для добавления/изменения клиента: nx run auth-hub:db:seed (или через /admin/clients).
    oidcProvider({
      loginPage: '/sign-in',
      consentPage: '/oauth/consent',

      // Безопасность
      requirePKCE: true,
      allowDynamicClientRegistration: false,

      // Время жизни токенов
      accessTokenExpiresIn: 3600, // 1 час
      refreshTokenExpiresIn: 604800, // 7 дней

      // Поддерживаемые scopes
      scopes: ['openid', 'profile', 'email', 'offline_access'],
    }),

    // Passkeys / WebAuthn (Этап 6.5 PLAN.md)
    passkeyPlugin(),

    // nextCookies() — ВСЕГДА последним (требование Better Auth)
    nextCookies(),
  ],

  // Сессии
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 дней
    updateAge: 60 * 60 * 24, // Обновлять каждый день
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 минут
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
    // Redis → secondary-storage; prod без Redis → database; dev → memory
    storage: process.env.REDIS_URL
      ? 'secondary-storage'
      : process.env.NODE_ENV === 'production'
      ? 'database'
      : 'memory',
    modelName: 'rateLimit',
    customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-in/*': { window: 60, max: 10 },
      '/sign-up/email': { window: 300, max: 3 },
      '/magic-link/*': { window: 300, max: 3 },
      '/forget-password': { window: 300, max: 3 },
      '/reset-password/*': { window: 60, max: 5 },
      '/verify-email': { window: 60, max: 10 },
      // Resend письма верификации (Этап 2 PLAN.md): защита от email-флуда.
      // IP-уровень по §13.3; точечный per-email лимит — TODO кастомного ключа.
      '/send-verification-email': { window: 60, max: 5 },
      // OIDC endpoints
      '/oauth2/authorize': { window: 60, max: 30 },
      '/oauth2/token': { window: 60, max: 30 },
    },
  },

  // Автоматическая привязка аккаунтов с тем же email
  // vk и yandex добавлены — после перехода kami на Ключницу (Этап 6) эти провайдеры
  // теперь основные для пользователей, мигрировавших с kami.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'github', 'facebook', 'vk', 'yandex'],
    },
  },

  // IP за reverse proxy
  advanced: {
    ipAddress: {
      ipAddressHeaders: ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'],
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
export type AuthUser = typeof auth.$Infer.Session.user

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
 * Проверить роль пользователя
 */
export async function hasRole(role: UserRole | UserRole[]): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) {
    return false
  }

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

/**
 * Требует авторизации, иначе редирект
 */
export async function requireAuth(): Promise<SessionWithRoles> {
  const { redirect } = await import('next/navigation')
  const session = await getSession()
  if (!session) {
    redirect('/sign-in')
  }
  return session as SessionWithRoles
}

/**
 * Требует роли ADMIN, иначе редирект
 */
export async function requireAdmin(): Promise<SessionWithRoles> {
  const { redirect } = await import('next/navigation')
  const session = await requireAuth()
  const admin = await isAdmin()
  if (!admin) {
    redirect('/')
  }
  return session
}
