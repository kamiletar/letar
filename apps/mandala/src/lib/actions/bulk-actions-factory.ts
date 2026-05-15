/**
 * Фабрика для создания bulk actions (массовые операции).
 *
 * ВАЖНО: Этот файл НЕ содержит 'use server' директиву,
 * т.к. функция createBulkActions — синхронная фабрика.
 * Server Actions создаются в файлах-потребителях с 'use server'.
 *
 * Генерирует типизированные функции для:
 * - bulkPublish — массовая публикация
 * - bulkUnpublish — массовое скрытие
 * - bulkDelete — массовое удаление
 *
 * @example
 * ```ts
 * // В bulk-actions.ts
 * import { createBulkActions } from '@/lib/actions/bulk-actions-factory'
 *
 * const { bulkPublish, bulkUnpublish, bulkDelete } = createBulkActions('mandala', '/admin/mandalas')
 *
 * export { bulkPublish as bulkPublishMandalas }
 * export { bulkUnpublish as bulkUnpublishMandalas }
 * export { bulkDelete as bulkDeleteMandalas }
 * ```
 */

import { revalidatePath } from 'next/cache'
import { assertAdminAuth } from './with-admin-auth'

/**
 * Максимальное количество IDs в одной bulk операции.
 * Защита от OOM при случайной передаче огромного массива.
 */
const MAX_BULK_IDS = 100

/**
 * Модели, поддерживающие bulk operations.
 * Должны иметь поле `published: boolean`.
 */
export type BulkableModel = 'mandala' | 'product' | 'contentPage'

/**
 * Интерфейс bulk actions для модели.
 */
export interface BulkActions {
  /** Массовая публикация */
  bulkPublish: (ids: string[]) => Promise<void>
  /** Массовое скрытие */
  bulkUnpublish: (ids: string[]) => Promise<void>
  /** Массовое удаление */
  bulkDelete: (ids: string[]) => Promise<void>
}

/**
 * Создаёт набор bulk actions для указанной модели.
 *
 * @param model - Название модели Prisma (camelCase)
 * @param revalidatePaths - Путь или массив путей для revalidation
 * @returns Объект с тремя функциями: bulkPublish, bulkUnpublish, bulkDelete
 */
export function createBulkActions(model: BulkableModel, revalidatePaths: string | string[]): BulkActions {
  const paths = Array.isArray(revalidatePaths) ? revalidatePaths : [revalidatePaths]

  /**
   * Массовая публикация записей.
   */
  async function bulkPublish(ids: string[]): Promise<void> {
    // Пропускаем операцию если массив пуст
    if (!ids.length) {
      return
    }

    // Защита от слишком большого массива
    if (ids.length > MAX_BULK_IDS) {
      throw new Error(`Превышен лимит: максимум ${MAX_BULK_IDS} записей за раз`)
    }

    const { db } = await assertAdminAuth()

    // Динамический доступ к модели
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelDelegate = (db as any)[model]

    await modelDelegate.updateMany({
      where: { id: { in: ids } },
      data: { published: true },
    })

    // Инвалидация кэша для всех путей
    for (const path of paths) {
      revalidatePath(path)
    }
  }

  /**
   * Массовое скрытие записей.
   */
  async function bulkUnpublish(ids: string[]): Promise<void> {
    // Пропускаем операцию если массив пуст
    if (!ids.length) {
      return
    }

    // Защита от слишком большого массива
    if (ids.length > MAX_BULK_IDS) {
      throw new Error(`Превышен лимит: максимум ${MAX_BULK_IDS} записей за раз`)
    }

    const { db } = await assertAdminAuth()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelDelegate = (db as any)[model]

    await modelDelegate.updateMany({
      where: { id: { in: ids } },
      data: { published: false },
    })

    for (const path of paths) {
      revalidatePath(path)
    }
  }

  /**
   * Массовое удаление записей.
   */
  async function bulkDelete(ids: string[]): Promise<void> {
    // Пропускаем операцию если массив пуст
    if (!ids.length) {
      return
    }

    // Защита от слишком большого массива
    if (ids.length > MAX_BULK_IDS) {
      throw new Error(`Превышен лимит: максимум ${MAX_BULK_IDS} записей за раз`)
    }

    const { db } = await assertAdminAuth()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelDelegate = (db as any)[model]

    await modelDelegate.deleteMany({
      where: { id: { in: ids } },
    })

    for (const path of paths) {
      revalidatePath(path)
    }
  }

  return { bulkPublish, bulkUnpublish, bulkDelete }
}
