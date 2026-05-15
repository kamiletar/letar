'use client'

import type { UserRole } from '@/generated/prisma'
import type { ReactNode } from 'react'
import { useUser } from './user-provider'

interface OnlyForProps {
  /** Роль или массив ролей для доступа */
  role: UserRole | UserRole[]
  /** Контент для отображения при наличии доступа */
  children: ReactNode
  /** Fallback при отсутствии доступа */
  fallback?: ReactNode
}

/**
 * Условный рендеринг по ролям пользователя.
 *
 * Использует UserProvider контекст — данные приходят из серверного layout,
 * не делает запросов к БД и не ждёт загрузки сессии.
 */
export function OnlyFor({ role, children, fallback = null }: OnlyForProps): ReactNode {
  const { roles } = useUser()

  const requiredRoles = Array.isArray(role) ? role : [role]

  if (!roles.length || !requiredRoles.some((r) => roles.includes(r))) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
