/**
 * Фабрика для создания create actions (создание сущностей).
 *
 * ВАЖНО: Этот файл НЕ содержит 'use server' директиву,
 * т.к. функция createCreateAction — синхронная фабрика.
 * Server Actions создаются в файлах-потребителях с 'use server'.
 *
 * Генерирует типизированную функцию создания с:
 * - Админ-авторизацией
 * - Zod валидацией
 * - Обработкой ошибок уникальности
 * - Redirect после успеха
 *
 * @example
 * ```ts
 * // В create-mandala.action.ts
 * 'use server'
 * import { createCreateAction } from '@/lib/actions/create-action-factory'
 * import { createMandalaSchema, type CreateMandalaInput } from '../../_schemas/mandala.schema'
 *
 * export const createMandala = createCreateAction({
 *   model: 'mandala',
 *   schema: createMandalaSchema,
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
 * Модели, поддерживающие создание через фабрику.
 */
export type CreatableModel = 'mandala' | 'product' | 'contentPage'

/**
 * Конфигурация для фабрики create action.
 */
export interface CreateActionConfig<TSchema extends z.ZodSchema> {
  /** Название модели Prisma (camelCase) */
  model: CreatableModel
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
  /** Трансформация данных перед созданием (опционально) */
  transformData?: (data: z.infer<TSchema>) => Record<string, unknown>
}

/**
 * Создаёт action для создания записи.
 *
 * @param config - Конфигурация фабрики
 * @returns Async функция создания
 */
export function createCreateAction<TSchema extends z.ZodSchema>(
  config: CreateActionConfig<TSchema>,
): (data: z.infer<TSchema>) => Promise<MutationResult> {
  const { model, schema, redirectPath, entityName, uniqueField, uniqueErrorMessage, transformData } = config

  return async function create(data: z.infer<TSchema>): Promise<MutationResult> {
    // TODO(temp-debug): диагностика 08/10 staging e2e — убрать после того как
    // подтвердим, доходит ли запрос до action и не валится ли валидация
    console.warn(`[DEBUG create-action-factory] model=${model} called, data:`, JSON.stringify(data))

    const { db } = await assertAdminAuth()

    const parsed = schema.safeParse(data)

    if (!parsed.success) {
      console.warn(
        `[DEBUG create-action-factory] model=${model} validation failed:`,
        JSON.stringify(parsed.error.flatten()),
      )
      return { success: false, error: 'Некорректные данные' }
    }

    let entityId: string

    try {
      // Динамический доступ к модели
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const modelDelegate = (db as any)[model]

      // Применяем трансформацию данных если есть
      const createData = transformData ? transformData(parsed.data) : parsed.data

      const entity = await modelDelegate.create({
        data: createData,
      })

      entityId = entity.id
    } catch (error) {
      console.error(`Failed to create ${model}:`, error)

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

      return { success: false, error: `Не удалось создать ${entityName}. Попробуйте еще раз.` }
    }

    // redirect вне try/catch — он выбрасывает NEXT_REDIRECT исключение
    redirect(redirectPath(entityId))
  }
}
