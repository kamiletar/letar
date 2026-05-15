import { sendPasswordResetEmail, sendVerificationEmail } from '@letar/email'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { genericOAuth } from 'better-auth/plugins'
import { cache } from 'react'
import { prismaAuth } from './prisma'

/**
 * Better Auth конфигурация для Premium Rosstil
 *
 * Особенности:
 * - Prisma adapter для PostgreSQL
 * - OAuth: Google, Yandex
 * - Email/password с верификацией
 * - Rate limiting
 * - Session-based auth с cookie caching
 */
export const auth = betterAuth({
  // Явное указание secret и baseURL (best practice)
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,

  database: prismaAdapter(prismaAuth, {
    provider: 'postgresql',
  }),

  // Email/Password auth
  emailAndPassword: {
    enabled: true,
    // Автоматическая верификация для внутренней системы
    autoSignIn: true,
    // Используем bcrypt для совместимости с кастомным /api/auth/register
    password: {
      hash: async (password: string) => {
        const bcrypt = await import('bcryptjs')
        return bcrypt.hash(password, 12)
      },
      verify: async ({ password, hash }: { password: string; hash: string }) => {
        const bcrypt = await import('bcryptjs')
        return bcrypt.compare(password, hash)
      },
    },
    // Сброс пароля
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name ?? undefined,
        resetUrl: url,
      })
    },
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
  },

  // OAuth провайдеры
  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID as string,
      clientSecret: process.env.AUTH_GOOGLE_SECRET as string,
    },
  },

  // Плагины
  plugins: [
    nextCookies(),
    // Yandex OAuth через genericOAuth (не встроенный провайдер)
    genericOAuth({
      config: [
        {
          providerId: 'yandex',
          clientId: process.env.AUTH_YANDEX_ID as string,
          clientSecret: process.env.AUTH_YANDEX_SECRET as string,
          authorizationUrl: 'https://oauth.yandex.ru/authorize',
          tokenUrl: 'https://oauth.yandex.ru/token',
          scopes: ['login:email', 'login:info', 'login:avatar'],
          getUserInfo: async (tokens) => {
            const response = await fetch('https://login.yandex.ru/info?format=json', {
              headers: {
                Authorization: `OAuth ${tokens.accessToken}`,
              },
            })
            const data = await response.json()
            return {
              id: data.id,
              email: data.default_email,
              name: data.display_name || data.real_name || data.login,
              image: data.default_avatar_id
                ? `https://avatars.yandex.net/get-yapic/${data.default_avatar_id}/islands-200`
                : undefined,
              emailVerified: true, // Yandex верифицирует email
            }
          },
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
    window: 60, // 60 секунд
    max: 10, // 10 запросов в минуту
    customRules: {
      '/sign-in/*': {
        window: 900, // 15 минут
        max: 5, // 5 попыток входа
      },
      '/sign-up/*': {
        window: 3600, // 1 час
        max: 3, // 3 регистрации
      },
    },
  },

  // Страницы
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/signin',
  },
})

// Экспорт типов
export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user

/**
 * Расширенный тип пользователя с кастомными полями
 */
export interface UserWithRole {
  id: string
  name: string | null
  email: string
  emailVerified: boolean
  image?: string | null
  createdAt: Date
  updatedAt: Date
  role: 'USER' | 'SELLER' | 'ADMIN'
}

export interface SessionWithRole {
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
  user: UserWithRole
}

/**
 * Получить текущую сессию (с кэшированием на request)
 *
 * React cache() дедуплицирует вызовы в рамках одного request —
 * множественные вызовы getSession() в разных компонентах
 * выполнят только один реальный запрос к базе данных.
 *
 * @example
 * const session = await getSession()
 * if (!session?.user) redirect('/auth/signin')
 */
export const getSession = cache(async (): Promise<SessionWithRole | null> => {
  const { headers } = await import('next/headers')
  const session = await auth.api.getSession({ headers: await headers() })
  return session as SessionWithRole | null
})

/**
 * Требует авторизации — редирект на /auth/signin если не авторизован
 */
export async function requireAuth(): Promise<UserWithRole> {
  const { redirect } = await import('next/navigation')
  const session = await getSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }
  // После redirect() выполнение не продолжится, но TypeScript не знает об этом
  return session!.user
}

/**
 * Требует роли ADMIN — редирект на / если не админ
 */
export async function requireAdmin(): Promise<UserWithRole> {
  const { redirect } = await import('next/navigation')
  const session = await getSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }
  if (session!.user.role !== 'ADMIN') {
    redirect('/')
  }
  // После redirect() выполнение не продолжится, но TypeScript не знает об этом
  return session!.user
}

/**
 * Требует роли SELLER — редирект на / если не продавец и не админ
 * ADMIN тоже проходит проверку (Елена — и ADMIN, и первый SELLER)
 */
export async function requireSeller(): Promise<UserWithRole> {
  const { redirect } = await import('next/navigation')
  const session = await getSession()
  if (!session?.user) {
    redirect('/auth/signin')
  }
  if (session!.user.role !== 'SELLER' && session!.user.role !== 'ADMIN') {
    redirect('/')
  }
  return session!.user
}

/**
 * Server-side OAuth sign-in для OAuth провайдеров
 *
 * Better Auth URL паттерны:
 * - Встроенные провайдеры (google): /api/auth/sign-in/social
 * - genericOAuth провайдеры (yandex): /api/auth/sign-in/oauth2
 *
 * @param provider - Провайдер OAuth (google, yandex)
 * @param options - Опции редиректа
 */
export async function signIn(provider: 'google' | 'yandex', options?: { redirectTo?: string }): Promise<never> {
  const { redirect } = await import('next/navigation')
  const callbackURL = options?.redirectTo ?? '/'

  // Google — встроенный провайдер, используем sign-in/social
  // Yandex — genericOAuth плагин, используем sign-in/oauth2
  if (provider === 'google') {
    // Для встроенных провайдеров используем server-side API
    const { headers } = await import('next/headers')
    const result = await auth.api.signInSocial({
      body: {
        provider: 'google',
        callbackURL,
      },
      headers: await headers(),
    })
    if (result.redirect && result.url) {
      return redirect(result.url)
    }
  }

  // Для genericOAuth (yandex) редиректим на oauth2 endpoint
  const signInUrl = `/api/auth/sign-in/oauth2?providerId=${provider}&callbackURL=${encodeURIComponent(callbackURL)}`
  return redirect(signInUrl)
}

/**
 * Выйти из системы (серверная функция)
 */
export async function signOut(): Promise<never> {
  const { redirect } = await import('next/navigation')
  return redirect('/api/auth/sign-out')
}
