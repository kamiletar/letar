'use server'

import type { ActionResult } from '@/app/_types/action-results'
import { assertAdminAuth } from '@/lib/actions'
import { revalidatePath } from 'next/cache'

/**
 * Отмечает сообщение как прочитанное.
 * @param messageId - ID сообщения
 * @returns ActionResult с результатом операции
 */
export async function markAsReadAction(messageId: string): Promise<ActionResult> {
  const { db } = await assertAdminAuth()

  try {
    await db.contactMessage.update({
      where: { id: messageId },
      data: { read: true },
    })

    revalidatePath('/admin/contacts')
    return { success: true }
  } catch (error) {
    console.error('Failed to mark message as read:', error)
    return { success: false, error: 'Не удалось отметить сообщение как прочитанное' }
  }
}
