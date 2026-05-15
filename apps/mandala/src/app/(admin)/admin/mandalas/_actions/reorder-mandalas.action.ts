'use server'

import { reorderItems } from '../../_actions/reorder-items.action'

/**
 * Обновляет порядок мандал после drag-and-drop.
 * @param orderedIds - массив ID мандал в новом порядке
 */
export async function reorderMandalas(orderedIds: string[]): Promise<{ success: boolean; error?: string }> {
  return reorderItems('mandala', orderedIds)
}
