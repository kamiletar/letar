import type { UserRole } from '@/generated/prisma'
import { createAuth, createRedisStorage } from '@letar/auth/server'
import { reportEmailFailure, sendMagicLinkEmail, sendVerificationEmail } from '@letar/email'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { genericOAuth, magicLink } from 'better-auth/plugins'
import { passkeyPlugin } from './passkey/plugin'
import { prisma } from './prisma'
import { telegramPlugin } from './telegram/plugin'

/**
 * Ключница — централизованный сервис авторизации
 *
 * Better Auth + OIDC Provider через createAuth({ mode: 'hub-provider' }).
 * OAuth провайдеры настроены ОДИН РАЗ для всех приложений монорепо.
 */

export const auth = createAuth({
  mode: 'hub-provider',

  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),

  // Redis secondaryStorage для rate-limit и сессионного кэша.
  // В dev REDIS_URL не задан → Better Auth fallback на memory.
  ...(process.env.REDIS_URL && { secondaryStorage: createRedisStorage(process.env.REDIS_URL) }),

  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3014',

  trustedOrigins: [
    'http://localhost:3014',
    'http://localhost:3012', // archetest
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(',').map((s) => s.trim()) : []),
  ],

  email: {
    sendVerificationEmail: async ({ to, userName, verificationUrl }) => {
      return sendVerificationEmail({ to, userName, verificationUrl })
    },
    reportEmailFailure: ({ type, to, error }) => {
      reportEmailFailure({ type, to, error })
    },
  },

  // OAuth провайдеры (настроены ОДИН РАЗ для всех приложений)
  socialProviders: {
    // GitHub
    ...(process.env.AUTH_GITHUB_ID &&
      process.env.AUTH_GITHUB_SECRET && {
        github: {
          clientId: process.env.AUTH_GITHUB_ID,
          clientSecret: process.env.AUTH_GITHUB_SECRET,
        },
      }),

    // Google
    ...(process.env.AUTH_GOOGLE_ID &&
      process.env.AUTH_GOOGLE_SECRET && {
        google: {
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        },
      }),

    // Facebook
    ...(process.env.AUTH_FACEBOOK_ID &&
      process.env.AUTH_FACEBOOK_SECRET && {
        facebook: {
          clientId: process.env.AUTH_FACEBOOK_ID,
          clientSecret: process.env.AUTH_FACEBOOK_SECRET,
        },
      }),

    // VK (ВКонтакте)
    ...(process.env.AUTH_VK_ID &&
      process.env.AUTH_VK_SECRET && {
        vk: {
          clientId: process.env.AUTH_VK_ID,
          clientSecret: process.env.AUTH_VK_SECRET,
          getUserInfo: async (tokens) => {
            const accessToken = tokens.accessToken
            if (!accessToken) {
              throw new Error('VK: no access token')
            }
            const userId = (tokens.raw as { user_id?: number })?.user_id
            const response = await fetch(
              `https://api.vk.com/method/users.get?user_ids=${userId}&fields=photo_200,screen_name&access_token=${accessToken}&v=5.131`
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

  // Дополнительные плагины поверх стандартных hub-provider
  // (oidcProvider и nextCookies добавляются фабрикой автоматически)
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
      config:
        process.env.AUTH_YANDEX_ID && process.env.AUTH_YANDEX_SECRET
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

    // Passkeys / WebAuthn (Этап 6.5 PLAN.md)
    passkeyPlugin(),

    // Telegram deep-link авторизация (Этап 6.6 PLAN.md)
    // Активен только если TELEGRAM_BOT_TOKEN + TELEGRAM_BOT_USERNAME заданы.
    ...(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME ? [telegramPlugin()] : []),
  ],

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

  // Привязка аккаунтов по email от доверенных провайдеров
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'github', 'facebook', 'vk', 'yandex'],
    },
  },

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
