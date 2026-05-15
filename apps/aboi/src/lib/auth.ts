import { sendPasswordResetEmail, sendVerificationEmail } from '@letar/email'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'
import { anonymous } from 'better-auth/plugins'
import { prismaAuth } from './prisma'

const baseURL = process.env.BETTER_AUTH_URL || 'http://localhost:3018'

/**
 * Better Auth конфигурация для НейроАбоИ.
 *
 * - email/password с обязательным подтверждением email (bcrypt)
 * - anonymous-плагин для гостевой корзины (cookie cart_id → anonymous user)
 * - nextCookies для совместимости с Next.js 16 server actions
 *
 * OAuth (Google/Yandex/VK) — отложено в W-волну.
 */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,

  database: prismaAdapter(prismaAuth, {
    provider: 'postgresql',
  }),

  baseURL,

  trustedOrigins: [
    'http://localhost:3018',
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...(process.env.NEXT_PUBLIC_BASE_URL ? [process.env.NEXT_PUBLIC_BASE_URL] : []),
  ],

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        userName: user.name || undefined,
        resetUrl: url,
      })
    },
    // bcrypt вместо scrypt — совместимость с @letar/auth и monorepo стандартом
    password: {
      hash: async (password) => {
        const bcrypt = await import('bcryptjs')
        return bcrypt.hash(password, 12)
      },
      verify: async ({ hash, password }) => {
        const bcrypt = await import('bcryptjs')
        return bcrypt.compare(password, hash)
      },
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({
        to: user.email,
        verificationUrl: url,
      })
    },
  },

  plugins: [
    nextCookies(),
    anonymous({
      // Когда anonymous-юзер регистрируется/логинится — мерджим его данные
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        const { mergeAnonymousAccount } = await import('./merge-anonymous')
        await mergeAnonymousAccount(anonymousUser.user.id, newUser.user.id)
      },
    }),
  ],

  user: {
    additionalFields: {
      roles: {
        type: 'string[]',
        defaultValue: ['CUSTOMER'],
        input: false,
      },
      phone: {
        type: 'string',
        required: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 дней
    updateAge: 60 * 60 * 24, // обновлять раз в день
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 20,
    customRules: {
      '/sign-in/*': { window: 900, max: 5 },
      '/sign-up/*': { window: 3600, max: 5 },
    },
  },

  pages: {
    signIn: '/sign-in',
    signUp: '/sign-up',
    error: '/sign-in',
  },
})

export type Session = typeof auth.$Infer.Session
