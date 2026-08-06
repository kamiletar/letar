/**
 * Фабрика для создания delete actions.
 *
 * ВАЖНО: Этот файл НЕ содержит 'use server' директиву,
 * т.к. функция createDeleteAction — синхронная фабрика.
 * Server Actions создаются в файлах-потребителях с 'use server'.
 *
 * Генерирует типизированную функцию удаления с:
 * - Админ-авторизацией
 * - Обработкой ошибок
 * - Redirect после успеха
 *
 * @example
 * ```ts
 * // В delete-mandala.action.ts
 * import { createDeleteAction } from '@/lib/actions/delete-action-factory'
 *
 * export const deleteMandala = createDeleteAction('mandala', '/admin/mandalas', 'мандалу')
 * ```
 */

import { redirect } from 'next/navigation'
import { assertAdminAuth } from './with-admin-auth'

/**
 * Модели, поддерживающие удаление.
 */
export type DeletableModel = 'mandala' | 'product' | 'contentPage' | 'contactMessage' | 'order'

/**
 * Создаёт action для удаления записи.
 *
 * @param model - Название модели Prisma (camelCase)
 * @param redirectPath - Путь для редиректа после удаления
 * @param entityName - Название сущности для сообщения об ошибке (в винительном падеже)
 * @returns Async функция удаления
 */
export function createDeleteAction(
  model: DeletableModel,
  redirectPath: string,
  entityName: string,
): (id: string) => Promise<never> {
  return async function deleteEntity(id: string): Promise<never> {
    const { db } = await assertAdminAuth()

    try {
      // Динамический доступ к модели
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modelDelegate = (db as any)[model]

      await modelDelegate.delete({
        where: { id },
      })
    } catch (error) {
      console.error(`Failed to delete ${model}:`, error)
      throw new Error(`Не удалось удалить ${entityName}`, { cause: error })
    }

    // redirect вне try/catch — он выбрасывает NEXT_REDIRECT исключение
    redirect(redirectPath)
  }
}
