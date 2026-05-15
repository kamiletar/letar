import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { genericOAuth } from 'better-auth/plugins'
import { prismaAuth } from './prisma'

/**
 * Better Auth конфигурация для IMOT
 *
 * Особенности:
 * - Prisma adapter для PostgreSQL
 * - OAuth: Google, Yandex
 * - Email/password с верификацией
 * - Роли: CLIENT, SPECIALIST, ADMIN
 * - Rate limiting
 * - Session-based auth с cookie caching
 */
export const auth = betterAuth({
  // Явное указание secret и baseURL (best practice)
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  // Доверенные origin для E2E тестов (localhost в dev режиме)
  trustedOrigins: process.env.NODE_ENV === 'development' ? ['http://localhost:3001'] : [],

  database: prismaAdapter(prismaAuth, {
    provider: 'postgresql',
  }),

  // Email/Password auth
  emailAndPassword: {
    enabled: true,
    // Автоматическая верификация для внутренней системы
    autoSignIn: true,
  },

  // OAuth провайдеры (только встроенные)
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
    // Yandex OAuth через genericOAuth (не встроенный провайдер)
    genericOAuth({
      config:
        process.env.AUTH_YANDEX_ID && process.env.AUTH_YANDEX_SECRET
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
                getUserInfo: async (tokens) => {
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
          : [],
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
        defaultValue: 'CLIENT',
        required: false,
      },
      phoneNumber: {
        type: 'string',
        required: false,
      },
      emailNotifications: {
        type: 'boolean',
        defaultValue: true,
        required: false,
      },
      notifySessionReminders: {
        type: 'boolean',
        defaultValue: true,
        required: false,
      },
      notifyNewPractices: {
        type: 'boolean',
        defaultValue: true,
        required: false,
      },
      notifyPracticeDiary: {
        type: 'boolean',
        defaultValue: true,
        required: false,
      },
    },
  },

  // Rate limiting (ослаблено для dev — E2E тесты делают много логинов)
  rateLimit: {
    enabled: true,
    window: 60, // 60 секунд
    max: process.env.NODE_ENV === 'development' ? 100 : 10,
    customRules: {
      '/sign-in/*': {
        window: 900, // 15 минут
        max: process.env.NODE_ENV === 'development' ? 50 : 5,
      },
      '/sign-up/*': {
        window: 3600, // 1 час
        max: process.env.NODE_ENV === 'development' ? 20 : 3,
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

// Экспорт типов (inferred от betterAuth)
export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user
