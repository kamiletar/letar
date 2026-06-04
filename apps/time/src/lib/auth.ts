import { createAuth, createSessionHelpers } from '@letar/auth/server'

export const auth = createAuth({
  mode: 'hub-client',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3013',
  trustedOrigins: ['http://localhost:3013', ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [])],
  oidc: {
    clientId: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    discoveryUrl: process.env.OIDC_DISCOVERY_URL,
  },
  pages: { signIn: '/sign-in' },
})

export type Session = typeof auth.$Infer.Session

const { getSession, getCurrentUser } = createSessionHelpers<Session>(auth)
export { getCurrentUser, getSession }

export async function requireAuth(): Promise<Session> {
  const { redirect } = await import('next/navigation')
  const session = await getSession()
  if (!session) redirect('/sign-in')
  return session as Session
}
