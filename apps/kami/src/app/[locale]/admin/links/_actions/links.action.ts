'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string }

const UpdateClassificationSchema = z
  .object({
    id: z.string().min(1),
    category: z.string().trim().max(100).nullable(),
    tags: z.array(z.string().trim().min(1).max(50)).max(20),
  })
  .strip()

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

/** Обновить категорию/метки ссылки (inline-редактирование прямо из таблицы) */
export async function updateLinkClassificationAction(input: unknown): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const parsed = UpdateClassificationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    const db = getEnhancedPrisma(session.user)
    await db.link.update({
      where: { id: parsed.data.id },
      data: { category: parsed.data.category || null, tags: parsed.data.tags },
    })
    // /links (публичная витрина) — не ревалидируем: force-dynamic уже отключает кэш страницы
    revalidatePath('/admin/links')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[updateLinkClassification] Error:', error)
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
