'use client'

import { useSession } from '@/lib/auth-client'
import type { UserRole } from '@/lib/auth.types'
import type { ReactNode } from 'react'

interface OnlyForProps {
  role: UserRole | UserRole[]
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Компонент для условного рендеринга на основе роли пользователя
 *
 * @example
 * ```tsx
 * <OnlyFor role="ADMIN">
 *   <AdminPanel />
 * </OnlyFor>
 * ```
 *
 * @example
 * ```tsx
 * <OnlyFor role={['ADMIN', 'VIEWER']}>
 *   <ViewContent />
 * </OnlyFor>
 * ```
 */
export function OnlyFor({ role, children, fallback = null }: OnlyForProps) {
  const { data: session } = useSession()

  // Типизация user с role
  const user = session?.user as { id: string; name: string; role?: UserRole } | undefined

  if (!user) {
    return <>{fallback}</>
  }

  const roles = Array.isArray(role) ? role : [role]
  const userRole = user.role || 'VIEWER'

  if (!roles.includes(userRole)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
