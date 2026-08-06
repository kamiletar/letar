/**
 * Guard-обёртки для server actions.
 * Убирают бойлерплейт requireAdminAction/requireCoachAction + if-check.
 * Директива 'use server' не нужна — импортируется из файлов с 'use server'.
 */

import { requireAdminAction } from '@/lib/roles'

/**
 * Оборачивает server action проверкой админских прав.
 * При ошибке авторизации возвращает `{ success: false, error }`.
 *
 * @example
 * export const getCitiesAction = adminGuard(async () => {
 *   const cities = await prisma.city.findMany()
 *   return { success: true, data: cities }
 * })
 */
export function adminGuard<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult | { success: false; error: string }> {
  return async (...args: TArgs) => {
    const auth = await requireAdminAction()
    if (!auth.success) {
      return { success: false, error: auth.error }
    }
    return fn(...args)
  }
}
