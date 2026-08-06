import type { UserRole } from '@/generated/prisma'
import { createAuth, createRedisStorage, createSessionHelpers } from '@letar/auth/server'
import { sendInvitationEmail } from '@letar/email'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { organization } from 'better-auth/plugins'
import { prisma } from './prisma'

export const auth = createAuth({
  mode: 'hub-client',

  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3005',
  trustedOrigins: ['http://localhost:3005', ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [])],

  oidc: {
    clientId: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    discoveryUrl: process.env.OIDC_DISCOVERY_URL,
  },

  ...(process.env.REDIS_URL && {
    secondaryStorage: createRedisStorage(process.env.REDIS_URL),
  }),

  rateLimit: {
    storage: process.env.REDIS_URL
      ? 'secondary-storage'
      : process.env.NODE_ENV === 'production'
      ? 'database'
      : 'memory',
    customRules: {
      '/organization/*': { window: 60, max: 30 },
    },
  },

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['letar-auth'],
    },
  },

  user: {
    additionalFields: {
      roles: {
        type: 'string[]',
        defaultValue: ['USER'],
        required: false,
      },
    },
  },

  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      sendInvitationEmail: async (data) => {
        const baseUrl = process.env.BETTER_AUTH_URL ?? 'http://localhost:3005'
        await sendInvitationEmail({
          to: data.email,
          inviterName: data.inviter.user.name || data.inviter.user.email,
          organizationName: data.organization.name,
          inviteUrl: `${baseUrl}/accept-invitation/${data.id}`,
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

  pages: { signIn: '/sign-in', error: '/sign-in' },
})

export type Session = typeof auth.$Infer.Session
export type User = typeof auth.$Infer.Session.user

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

const { getSession: _getSession, getCurrentUser: _getCurrentUser } = createSessionHelpers<Session>(auth)

export async function getSession(): Promise<SessionWithRoles | null> {
  return _getSession() as Promise<SessionWithRoles | null>
}

export async function getCurrentUser(): Promise<UserWithRoles | null> {
  return _getCurrentUser() as Promise<UserWithRoles | null>
}

/**
 * Проверяет роль пользователя с DB-фолбэком.
 * cookieCache может не включать additionalFields → подтягиваем roles из БД.
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

  const targets = Array.isArray(role) ? role : [role]
  return targets.some((r) => userRoles.includes(r))
}

export async function isAdmin(): Promise<boolean> {
  return hasRole('ADMIN')
}
