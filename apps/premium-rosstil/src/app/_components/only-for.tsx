'use client'

import type { UserRole } from '@/generated/prisma'
import { useSession } from '@/lib/auth-client'
import type { ReactNode } from 'react'

type Role = UserRole | 'UNAUTHORIZED'

interface OnlyForProps {
  userRole: Role | Role[]
  children: ReactNode
  /** Контент для отображения, если роль не совпадает */
  fallback?: ReactNode
}

/**
 * Компонент для условного рендеринга контента на основе роли пользователя
 *
 * @example
 * ```tsx
 * <OnlyFor userRole="ADMIN">
 *   <AdminPanel />
 * </OnlyFor>
 *
 * <OnlyFor userRole={['USER', 'ADMIN']}>
 *   <UserContent />
 * </OnlyFor>
 *
 * <OnlyFor userRole="UNAUTHORIZED">
 *   <SignInPrompt />
 * </OnlyFor>
 *
 * // С fallback — если роль не совпадает, показать fallback
 * <OnlyFor userRole={['USER', 'ADMIN']} fallback={<SignInButton />}>
 *   <PhoneButton />
 * </OnlyFor>
 * ```
 *
 * Поддерживаемые роли:
 * - UserRole.USER - авторизованный пользователь с ролью USER
 * - UserRole.ADMIN - авторизованный пользователь с ролью ADMIN
 * - 'UNAUTHORIZED' - неавторизованный пользователь
 */
export function OnlyFor({ userRole, children, fallback = null }: OnlyForProps) {
  const { data: session, isPending } = useSession()

  // Нормализуем роли в массив
  const allowedRoles = Array.isArray(userRole) ? userRole : [userRole]

  // Если сессия ещё загружается, ничего не рендерим
  if (isPending) {
    return null
  }

  // Проверка для неавторизованных пользователей
  if (!session?.user) {
    return allowedRoles.includes('UNAUTHORIZED') ? children : fallback
  }

  // Проверка для авторизованных пользователей
  // Better Auth хранит role как дополнительное поле
  const userRoleValue = (session.user as { role?: UserRole }).role ?? 'USER'
  return allowedRoles.includes(userRoleValue) ? children : fallback
}
