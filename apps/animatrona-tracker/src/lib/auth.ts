'use server'

import type { SessionWithRole } from './auth.types'

/**
 * Получить текущую сессию
 * Использует headers() для получения сессии из cookie
 *
 * @example
 * // В Server Component или Server Action
 * const session = await getSession()
 * if (!session?.user) redirect('/sign-in')
 */
export async function getSession(): Promise<SessionWithRole | null> {
  const { auth } = await import('./auth-config')
  const { headers } = await import('next/headers')
  const session = await auth.api.getSession({ headers: await headers() })
  return session as SessionWithRole | null
}
