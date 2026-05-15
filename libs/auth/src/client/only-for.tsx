'use client'

import type { ReactNode } from 'react'

/**
 * Props для компонента OnlyFor
 */
export interface OnlyForProps<TRole extends string = string> {
  /** Роль или массив ролей для доступа */
  role: TRole | TRole[]
  /** Контент для отображения при наличии доступа */
  children: ReactNode
  /** Fallback при отсутствии доступа */
  fallback?: ReactNode
  /** Сессия пользователя (null если не авторизован) */
  session: { user: { role: TRole } } | null
  /** Загрузка сессии (скрывает контент пока загружается) */
  isPending?: boolean
}

/**
 * Компонент условного рендеринга по роли пользователя
 *
 * @example
 * ```tsx
 * // В компоненте приложения (с useSession)
 * export function OnlyFor(props: Omit<OnlyForProps<UserRole>, 'session' | 'isPending'>) {
 *   const { data: session, isPending } = authClient.useSession()
 *   return <BaseOnlyFor {...props} session={session} isPending={isPending} />
 * }
 *
 * // Использование
 * <OnlyFor role="ADMIN">
 *   <AdminPanel />
 * </OnlyFor>
 *
 * <OnlyFor role={['ADMIN', 'MODERATOR']} fallback={<AccessDenied />}>
 *   <ModeratorTools />
 * </OnlyFor>
 * ```
 */
export function OnlyFor<TRole extends string>({
  role,
  children,
  fallback = null,
  session,
  isPending = false,
}: OnlyForProps<TRole>): ReactNode {
  // Пока загружается сессия — ничего не показываем
  if (isPending) {
    return null
  }

  const roles = Array.isArray(role) ? role : [role]

  // Нет сессии или роль не совпадает — показываем fallback
  if (!session?.user || !roles.includes(session.user.role)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
