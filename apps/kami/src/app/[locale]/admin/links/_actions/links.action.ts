'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string }

/** Переключить статус "прочитано" у ссылки */
export async function toggleLinkReadAction(id: string, read: boolean): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const db = getEnhancedPrisma(session.user)
    await db.link.update({ where: { id }, data: { read } })
    revalidatePath('/admin/links')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[toggleLinkRead] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}

/** Удалить сохранённую ссылку */
export async function deleteLinkAction(id: string): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const db = getEnhancedPrisma(session.user)
    await db.link.delete({ where: { id } })
    revalidatePath('/admin/links')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteLink] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}
