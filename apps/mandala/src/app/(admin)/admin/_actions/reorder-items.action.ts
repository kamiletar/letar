'use server'

import { requireAdminAuth } from '@/lib/actions'
import { revalidatePath } from 'next/cache'
import { REORDER_CONFIGS, type ReorderableModel } from './reorder-config'

/**
 * Универсальный action для переупорядочивания записей после drag-and-drop.
 *
 * @param model - Тип модели ('mandala' | 'product')
 * @param orderedIds - Массив ID в новом порядке
 */
export async function reorderItems(
  model: ReorderableModel,
  orderedIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const authResult = await requireAdminAuth()
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  const { db } = authResult.context
  const config = REORDER_CONFIGS[model]

  try {
    // Обновляем order для каждой записи
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const modelDelegate = (db as any)[model]

    await Promise.all(
      orderedIds.map((id, index) =>
        modelDelegate.update({
          where: { id },
          data: { order: index },
        })
      ),
    )

    // Инвалидируем кэш
    config.revalidatePaths.forEach((path) => revalidatePath(path))

    return { success: true }
  } catch (error) {
    console.error(`Ошибка при сортировке ${config.modelName}:`, error)
    return { success: false, error: 'Не удалось сохранить порядок' }
  }
}
