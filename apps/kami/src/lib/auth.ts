import type { UserRole } from '@/generated/prisma'
import { sendInvitationEmail, sendMagicLinkEmail, sendVerificationEmail } from '@letar/email'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { genericOAuth, magicLink, organization } from 'better-auth/plugins'
import { prisma } from './prisma'

/**
 * Better Auth конфигурация для Kami
 *
 * Особенности:
 * - Prisma adapter для PostgreSQL
 * - OAuth: GitHub, Google, Yandex
 * - Email/password аутентификация с верификацией
 * - Magic Link для входа без пароля
 * - Роли: USER, ADMIN (массив roles)
 * - Session-based auth с cookie caching
 */
export const auth = betterAuth({
  // Явное указание secret (best practice)
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Base URL для генерации callback URLs (ngrok для VK, иначе localhost)
  baseURL: process.env.NGROK_URL || process.env.BETTER_AUTH_URL || 'http://localhost:3005',

  // Доверенные домены (для ngrok и production)
  trustedOrigins: [
    'http://localhost:3005',
    ...(process.env.NGROK_URL ? [process.env.NGROK_URL] : []),
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ],

  // Email/Password auth
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: true,
  },

  // Email верификация
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({
        to: user.email,
        userName: user.name ?? undefined,
        verificationUrl: url,
      })
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },

  // OAuth провайдеры
  socialProviders: {
    // GitHub OAuth
    ...(process.env.AUTH_GITHUB_ID
      && process.env.AUTH_GITHUB_SECRET && {
      github: {
        clientId: process.env.AUTH_GITHUB_ID,
        clientSecret: process.env.AUTH_GITHUB_SECRET,
      },
    }),

    // Google OAuth
    ...(process.env.AUTH_GOOGLE_ID
      && process.env.AUTH_GOOGLE_SECRET && {
      google: {
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      },
    }),

    // Facebook OAuth (нативный в Better Auth)
    ...(process.env.AUTH_FACEBOOK_ID
      && process.env.AUTH_FACEBOOK_SECRET && {
      facebook: {
        clientId: process.env.AUTH_FACEBOOK_ID,
        clientSecret: process.env.AUTH_FACEBOOK_SECRET,
      },
    }),

    // VK (ВКонтакте) OAuth
    ...(process.env.AUTH_VK_ID
      && process.env.AUTH_VK_SECRET && {
      vk: {
        clientId: process.env.AUTH_VK_ID,
        clientSecret: process.env.AUTH_VK_SECRET,
        // Кастомный getUserInfo для VK API
        getUserInfo: async (tokens) => {
          // VK ID возвращает user_id в токене
          const userId = (tokens.raw as { user_id?: number })?.user_id

          // Получаем данные пользователя через VK API
          const response = await fetch(
            `https://api.vk.com/method/users.get?user_ids=${userId}&fields=photo_200,screen_name&access_token=${tokens.accessToken}&v=5.131`,
          )
          const data = await response.json()
          const user = data.response?.[0]

          if (!user) {
            throw new Error('VK user not found')
          }

          // VK не возвращает email через users.get, получаем из токена
          const email = (tokens.raw as { email?: string })?.email

          return {
            user: {
              id: String(user.id),
              name: `${user.first_name} ${user.last_name}`.trim() || user.screen_name,
              email: email || `${user.id}@vk.com`, // Fallback если нет email
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
  plugins: [
    nextCookies(),

    // Magic Link для входа без пароля
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // Получаем имя пользователя из БД
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
      disableSignUp: false, // Разрешить регистрацию через magic link
    }),

    // genericOAuth: ключница (OIDC) + Yandex
    genericOAuth({
      config: [
        // Ключница (auth.letar.best) — единый вход через OIDC
        ...(process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET
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
          : []),
        // Yandex OAuth
        ...(process.env.AUTH_YANDEX_ID && process.env.AUTH_YANDEX_SECRET
          ? [
            {
              providerId: 'yandex',
              clientId: process.env.AUTH_YANDEX_ID,
              clientSecret: process.env.AUTH_YANDEX_SECRET,
              // Явные endpoints (discoveryUrl блокируется капчей)
              authorizationUrl: 'https://oauth.yandex.ru/authorize',
              tokenUrl: 'https://oauth.yandex.ru/token',
              scopes: ['login:email', 'login:info', 'login:avatar'],
              // Кастомный getUserInfo для Yandex API
              getUserInfo: async (tokens: { accessToken?: string }) => {
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
          : []),
      ],
    }),

    // Organization plugin для командных опросов
    organization({
      // Любой авторизованный пользователь может создать организацию (при отправке HireRequest)
      allowUserToCreateOrganization: true,

      // Email-приглашения
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

      // Callback после принятия приглашения
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

  // Rate limiting — защита от brute-force атак
  // В production используем БД, в dev — memory (быстрее)
  rateLimit: {
    enabled: true,
    window: 60, // Глобальное окно: 60 секунд
    max: 100, // Глобальный лимит: 100 запросов
    storage: process.env.NODE_ENV === 'production' ? 'database' : 'memory',
    modelName: 'rateLimit',
    customRules: {
      // Вход по email/password — строгий лимит (защита от brute-force)
      '/sign-in/email': {
        window: 60,
        max: 5, // 5 попыток в минуту
      },
      // Остальные методы входа
      '/sign-in/*': {
        window: 60,
        max: 10,
      },
      // Регистрация — очень строгий лимит (защита от спама)
      '/sign-up/email': {
        window: 300, // 5 минут
        max: 3, // 3 попытки
      },
      // Magic link — строгий лимит (защита от email bombing)
      '/magic-link/*': {
        window: 300,
        max: 3,
      },
      // Сброс пароля — строгий лимит
      '/forget-password': {
        window: 300,
        max: 3,
      },
      '/reset-password/*': {
        window: 60,
        max: 5,
      },
      // Email верификация
      '/verify-email': {
        window: 60,
        max: 10,
      },
      // Организации — умеренный лимит
      '/organization/*': {
        window: 60,
        max: 30,
      },
    },
  },

  // Автоматическая привязка OAuth аккаунтов с тем же email
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'github', 'facebook', 'letar-auth'],
    },
  },

  // Advanced настройки
  advanced: {
    // IP address для rate limiting за reverse proxy (Nginx Proxy Manager)
    ipAddress: {
      // Стандартные заголовки от proxy
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
