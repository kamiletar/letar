'use server'

/**
 * Хелпер для защиты Server Actions админ-авторизацией.
 * Проверяет наличие сессии и роль ADMIN.
 */

import type { UserRole } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

/** Контекст авторизованного админа */
export interface AdminContext {
  /** ID пользователя */
  userId: string
  /** Email пользователя */
  email: string
  /** Роль пользователя */
  role: UserRole
  /** Prisma клиент с access control */
  db: ReturnType<typeof getEnhancedPrisma>
}

/** Результат админ-авторизации */
export type AdminAuthResult = { success: true; context: AdminContext } | { success: false; error: string }

/**
 * Проверяет админ-авторизацию и возвращает контекст.
 *
 * @example
 * ```ts
 * export async function deleteProduct(id: string) {
 *   const auth = await requireAdminAuth()
 *   if (!auth.success) throw new Error(auth.error)
 *
 *   await auth.context.db.product.delete({ where: { id } })
 *   redirect('/admin/products')
 * }
 * ```
 */
export async function requireAdminAuth(): Promise<AdminAuthResult> {
  const session = await getSession()

  if (!session?.user) {
    return { success: false, error: 'Unauthorized' }
  }

  if (session.user.role !== 'ADMIN') {
    return { success: false, error: 'Forbidden: Admin access required' }
  }

  const db = getEnhancedPrisma(session.user)

  return {
    success: true,
    context: {
      userId: session.user.id,
      email: session.user.email ?? '',
      role: session.user.role as UserRole,
      db,
    },
  }
}

/**
 * Выбрасывает исключение если пользователь не админ.
 * Используй когда нужно сразу прервать выполнение.
 *
 * @example
 * ```ts
 * export async function deleteProduct(id: string) {
 *   const { db } = await assertAdminAuth()
 *   await db.product.delete({ where: { id } })
 *   redirect('/admin/products')
 * }
 * ```
 */
export async function assertAdminAuth(): Promise<AdminContext> {
  const auth = await requireAdminAuth()

  if (!auth.success) {
    throw new Error(auth.error)
  }

  return auth.context
}

/** Стандартный результат мутации */
export type MutationResult<T = void> = { success: true; data?: T } | { success: false; error: string; field?: string }
