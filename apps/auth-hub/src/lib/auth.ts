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

    // VK (ВКонтакте): нативный провайдер Better Auth 1.7 — VK ID (OAuth 2.1, id.vk.ru),
    // обязательный PKCE. Старые Standalone-приложения VK (oauth.vk.com/vk.ru, API 5.131)
    // принудительно перенесены VK в сервис VK ID — legacy-эндпоинт для уже мигрировавших
    // приложений отвечает `{"error":"invalid_request","error_description":"Security Error"}`
    // независимо от PKCE. getUserInfo переопределён, чтобы сохранить синтетический email
    // `<id>@vk.com` для пользователей, не выдавших scope email (как было в старом флоу).
    ...(process.env.AUTH_VK_ID && process.env.AUTH_VK_SECRET && {
      vk: {
        clientId: process.env.AUTH_VK_ID,
        clientSecret: process.env.AUTH_VK_SECRET,
        getUserInfo: async (tokens: { accessToken?: string }) => {
          if (!tokens.accessToken) {
            return null
          }
          const response = await fetch('https://id.vk.com/oauth2/user_info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              access_token: tokens.accessToken,
              client_id: process.env.AUTH_VK_ID!,
            }).toString(),
          })
          const data = await response.json()
          const profile = data?.user as
            | { user_id: string; first_name?: string; last_name?: string; email?: string; avatar?: string }
            | undefined

          if (!profile) {
            return null
          }

          return {
            user: {
              name: `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || undefined,
              email: profile.email || `${profile.user_id}@vk.com`,
              image: profile.avatar,
              emailVerified: !!profile.email,
            },
            // `VkProfile` требует first_name/last_name/birthday непустыми строками — id.vk.com
            // их не всегда отдаёт, дефолтим на пустую строку, сам аккаунт мапится по email выше.
            data: {
              user: {
                user_id: profile.user_id,
                first_name: profile.first_name ?? '',
                last_name: profile.last_name ?? '',
                email: profile.email,
                avatar: profile.avatar,
                birthday: '',
              },
            },
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

    // Yandex через genericOAuth (VK переехал в socialProviders.vk — нативный VK ID, см. выше)
    genericOAuth({
      config: [
        ...(process.env.AUTH_YANDEX_ID && process.env.AUTH_YANDEX_SECRET
          ? [
            {
              providerId: 'yandex',
              clientId: process.env.AUTH_YANDEX_ID,
              clientSecret: process.env.AUTH_YANDEX_SECRET,
              authorizationUrl: 'https://oauth.yandex.ru/authorize',
              tokenUrl: 'https://oauth.yandex.ru/token',
              scopes: ['login:email', 'login:info', 'login:avatar'],
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
      // Явная привязка через linkSocial() на /profile/connected-accounts — email провайдера
      // (или синтетический `<id>@vk.com` для VK-пользователей без email-scope) не обязан
      // совпадать с email текущей сессии. Без этого флага Better Auth молча роняет привязку
      // с EMAIL_DOES_NOT_MATCH и редиректит на errorURL без явного сообщения об ошибке.
      allowDifferentEmails: true,
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
