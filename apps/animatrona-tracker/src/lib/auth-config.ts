import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { genericOAuth } from 'better-auth/plugins'
import { prismaAuth } from './prisma'

/**
 * Better Auth конфигурация для Animatrona Tracker
 *
 * Особенности:
 * - Prisma adapter для PostgreSQL
 * - OAuth: Google, Yandex, VK
 * - Email/password с верификацией
 * - Роли: USER, MODERATOR, ADMIN
 * - Rate limiting
 * - Session-based auth с cookie caching
 */
export const auth = betterAuth({
  // Явное указание secret и baseURL
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  database: prismaAdapter(prismaAuth, {
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
    // OAuth провайдеры через genericOAuth (включая ключницу)
    genericOAuth({
      config: [
        // Ключница (auth.letar.best) — единый вход через OIDC
        ...(process.env.OIDC_CLIENT_ID && process.env.OIDC_CLIENT_SECRET
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
          : []),
        // Yandex OAuth
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
                  const response = await fetch('https://login.yandex.ru/info?format=json', {
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
        // Shikimori OAuth
        ...(process.env.AUTH_SHIKIMORI_ID && process.env.AUTH_SHIKIMORI_SECRET
          ? [
              {
                providerId: 'shikimori',
                clientId: process.env.AUTH_SHIKIMORI_ID,
                clientSecret: process.env.AUTH_SHIKIMORI_SECRET,
                authorizationUrl: 'https://shikimori.one/oauth/authorize',
                tokenUrl: 'https://shikimori.one/oauth/token',
                scopes: ['user_rates'],
                getUserInfo: async (tokens: { accessToken?: string }) => {
                  const response = await fetch('https://shikimori.one/api/users/whoami', {
                    headers: {
                      'User-Agent': 'AnimatronaTracker',
                      Authorization: `Bearer ${tokens.accessToken}`,
                    },
                  })
                  const data = await response.json()
                  return {
                    id: String(data.id),
                    name: data.nickname,
                    email: undefined, // Shikimori не отдаёт email
                    image: data.image?.x160 || data.avatar,
                    emailVerified: false,
                  }
                },
              },
            ]
          : []),
        // VK OAuth
        ...(process.env.AUTH_VK_ID && process.env.AUTH_VK_SECRET
          ? [
              {
                providerId: 'vk',
                clientId: process.env.AUTH_VK_ID,
                clientSecret: process.env.AUTH_VK_SECRET,
                authorizationUrl: 'https://oauth.vk.com/authorize',
                tokenUrl: 'https://oauth.vk.com/access_token',
                scopes: ['email'],
                getUserInfo: async (tokens: { accessToken?: string; email?: string }) => {
                  const response = await fetch(
                    `https://api.vk.com/method/users.get?access_token=${tokens.accessToken}&fields=photo_200,email&v=5.131`
                  )
                  const data = await response.json()
                  const user = data.response?.[0]
                  return {
                    id: String(user?.id),
                    name: `${user?.first_name} ${user?.last_name}`.trim(),
                    email: tokens.email,
                    image: user?.photo_200,
                    emailVerified: true,
                  }
                },
              },
            ]
          : []),
      ],
    }),
  ],

  // Настройки сессии
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 дней
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
      customGateway: {
        type: 'string',
        required: false,
      },
      birthDate: {
        type: 'date',
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

  // Автоматическая привязка OAuth аккаунтов с тем же email
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['google', 'letar-auth'],
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
