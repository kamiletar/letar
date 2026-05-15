import { requireAuth } from '@/lib/auth-utils'
import type { ReactNode } from 'react'

/**
 * Защита всего сегмента /profile — редирект на /sign-in для гостей.
 * Better Auth не работает в Edge middleware, поэтому проверка в layout.
 */
export default async function ProfileLayout({ children }: { children: ReactNode }) {
  await requireAuth()
  return children
}
