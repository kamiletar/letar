'use server'

import { reorderItems } from '../../_actions/reorder-items.action'

/**
 * Обновляет порядок товаров после drag-and-drop.
 * @param orderedIds - массив ID товаров в новом порядке
 */
export async function reorderProducts(orderedIds: string[]): Promise<{ success: boolean; error?: string }> {
  return reorderItems('product', orderedIds)
}
