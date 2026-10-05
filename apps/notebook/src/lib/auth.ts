import { createAuth, createSessionHelpers } from '@letar/auth/server'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './db'

const baseURL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3127'

export const auth = createAuth({
  mode: 'hub-client',
  database: prismaAdapter(prisma as never, { provider: 'postgresql' }),
  baseURL,
  trustedOrigins: ['http://localhost:3127', baseURL],
  oidc: {
    clientId: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    discoveryUrl: process.env.OIDC_DISCOVERY_URL,
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ['letar-auth'],
    },
  },
})

export type Session = typeof auth.$Infer.Session

export const { getSession, getCurrentUser } = createSessionHelpers<Session>(auth)
