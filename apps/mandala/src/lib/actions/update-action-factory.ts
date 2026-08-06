/**
 * Фабрика для создания update actions (обновление сущностей).
 *
 * ВАЖНО: Этот файл НЕ содержит 'use server' директиву,
 * т.к. функция createUpdateAction — синхронная фабрика.
 * Server Actions создаются в файлах-потребителях с 'use server'.
 *
 * Генерирует типизированную функцию обновления с:
 * - Админ-авторизацией
 * - Zod валидацией
 * - Обработкой ошибок уникальности
 * - Redirect после успеха
 *
 * @example
 * ```ts
 * // В update-mandala.action.ts
 * 'use server'
 * import { createUpdateAction } from '@/lib/actions/update-action-factory'
 * import { updateMandalaSchema } from '../../../_schemas/mandala.schema'
 *
 * export const updateMandala = createUpdateAction({
 *   model: 'mandala',
 *   schema: updateMandalaSchema,
 *   redirectPath: (id) => `/admin/mandalas/${id}`,
 *   entityName: 'мандалу',
 *   uniqueField: 'slug',
 * })
 * ```
 */

import { redirect } from 'next/navigation'
import type { z } from 'zod/v4'
import { handleUniqueConstraintError } from './error-helpers'
import { assertAdminAuth, type MutationResult } from './with-admin-auth'

/**
 * Модели, поддерживающие обновление через фабрику.
 */
export type UpdatableModel = 'mandala' | 'product' | 'contentPage'

/**
 * Конфигурация для фабрики update action.
 */
export interface UpdateActionConfig<TSchema extends z.ZodSchema> {
  /** Название модели Prisma (camelCase) */
  model: UpdatableModel
  /** Zod схема валидации */
  schema: TSchema
  /** Функция для генерации пути редиректа */
  redirectPath: (id: string) => string
  /** Название сущности для сообщения об ошибке (в винительном падеже) */
  entityName: string
  /** Поле с уникальным ограничением (опционально) */
  uniqueField?: string
  /** Сообщение об ошибке уникальности (опционально) */
  uniqueErrorMessage?: string
  /** Трансформация данных перед обновлением (опционально) */
  transformData?: (data: z.infer<TSchema>) => Record<string, unknown>
}

/**
 * Создаёт action для обновления записи.
 *
 * @param config - Конфигурация фабрики
 * @returns Async функция обновления (принимает id и data)
 */
export function createUpdateAction<TSchema extends z.ZodSchema>(
  config: UpdateActionConfig<TSchema>,
): (id: string, data: z.infer<TSchema>) => Promise<MutationResult> {
  const { model, schema, redirectPath, entityName, uniqueField, uniqueErrorMessage, transformData } = config

  return async function update(id: string, data: z.infer<TSchema>): Promise<MutationResult> {
    const { db } = await assertAdminAuth()

    const parsed = schema.safeParse(data)

    if (!parsed.success) {
      return { success: false, error: 'Некорректные данные' }
    }

    try {
      // Динамический доступ к модели
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modelDelegate = (db as any)[model]

      // Применяем трансформацию данных если есть
      const updateData = transformData ? transformData(parsed.data) : parsed.data

      await modelDelegate.update({
        where: { id },
        data: updateData,
      })
    } catch (error) {
      console.error(`Failed to update ${model}:`, error)

      // Обработка ошибки уникальности
      if (uniqueField) {
        const defaultMessage = `${
          entityName.charAt(0).toUpperCase() + entityName.slice(1)
        } с таким ${uniqueField} уже существует`
        const uniqueError = handleUniqueConstraintError(error, uniqueField, uniqueErrorMessage ?? defaultMessage)
        if (uniqueError) {
          return uniqueError
        }
      }

      return { success: false, error: `Не удалось обновить ${entityName}. Попробуйте еще раз.` }
    }

    // redirect вне try/catch — он выбрасывает NEXT_REDIRECT исключение
    redirect(redirectPath(id))
  }
}
