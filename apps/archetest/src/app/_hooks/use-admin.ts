'use client'

import { useSession } from '@/lib/auth-client'

/**
 * Проверяет, является ли текущий пользователь админом
 */
export function useIsAdmin() {
  const { data: session } = useSession()
  const roles = (session?.user as { roles?: string[] } | undefined)?.roles
  const isAdmin = roles?.includes('ADMIN') ?? false
  return { isAdmin }
}
