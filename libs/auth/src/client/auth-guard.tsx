'use client'

import { useRouter } from 'next/navigation'
import { type JSX, type ReactNode, useEffect } from 'react'

/**
 * Props для AuthGuard
 */
export interface AuthGuardProps<TRole extends string = string> {
  /** Контент для защиты */
  children: ReactNode
  /** Требуемая роль (опционально) */
  role?: TRole | TRole[]
  /** URL для редиректа неавторизованных (по умолчанию '/sign-in') */
  redirectTo?: string
  /** Fallback во время загрузки */
  loadingFallback?: ReactNode
  /** Fallback при отсутствии доступа (вместо редиректа) */
  accessDeniedFallback?: ReactNode
}

/**
 * Интерфейс для useSession хука
 */
interface UseSessionResult<TRole extends string> {
  data: { user: { role: TRole } } | null
  isPending: boolean
}

/**
 * Создаёт компонент AuthGuard с привязкой к useSession
 *
 * @example
 * ```tsx
 * // apps/my-app/src/app/_components/auth-guard.tsx
 * import { createAuthGuard } from '@letar/auth/client'
 * import { useSession } from '@/lib/auth-client'
 * import type { UserRole } from '@/generated/prisma'
 *
 * export const AuthGuard = createAuthGuard<UserRole>(useSession)
 *
 * // Использование с редиректом
 * <AuthGuard role="ADMIN" redirectTo="/sign-in">
 *   <AdminPanel />
 * </AuthGuard>
 *
 * // Использование с fallback вместо редиректа
 * <AuthGuard role="ADMIN" accessDeniedFallback={<AccessDenied />}>
 *   <AdminPanel />
 * </AuthGuard>
 * ```
 */
export function createAuthGuard<TRole extends string = string>(useSession: () => UseSessionResult<TRole>) {
  return function AuthGuard({
    children,
    role,
    redirectTo = '/sign-in',
    loadingFallback = null,
    accessDeniedFallback,
  }: AuthGuardProps<TRole>): JSX.Element | null {
    const { data: session, isPending } = useSession()
    const router = useRouter()

    useEffect(() => {
      // Не делаем ничего пока загружается
      if (isPending) {
        return
      }

      // Не авторизован
      if (!session) {
        if (!accessDeniedFallback) {
          router.replace(redirectTo)
        }
        return
      }

      // Проверка роли
      if (role) {
        const roles = Array.isArray(role) ? role : [role]
        if (!roles.includes(session.user.role)) {
          if (!accessDeniedFallback) {
            router.replace(redirectTo)
          }
        }
      }
    }, [session, isPending, role, redirectTo, router, accessDeniedFallback])

    // Загрузка
    if (isPending) {
      return <>{loadingFallback}</>
    }

    // Не авторизован
    if (!session) {
      return accessDeniedFallback ? <>{accessDeniedFallback}</> : null
    }

    // Проверка роли
    if (role) {
      const roles = Array.isArray(role) ? role : [role]
      if (!roles.includes(session.user.role)) {
        return accessDeniedFallback ? <>{accessDeniedFallback}</> : null
      }
    }

    return <>{children}</>
  }
}
