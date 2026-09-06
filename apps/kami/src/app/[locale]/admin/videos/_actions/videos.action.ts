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

/** Обновить категорию/метки видео (inline-редактирование прямо из таблицы) */
export async function updateVideoClassificationAction(input: unknown): Promise<ActionResult<void>> {
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
    await db.video.update({
      where: { id: parsed.data.id },
      data: { category: parsed.data.category || null, tags: parsed.data.tags },
    })
    // /links (публичная витрина) — не ревалидируем: force-dynamic уже отключает кэш страницы
    revalidatePath('/admin/videos')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[updateVideoClassification] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}

/** Удалить сохранённое видео */
export async function deleteVideoAction(id: string): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const db = getEnhancedPrisma(session.user)
    await db.video.delete({ where: { id } })
    revalidatePath('/admin/videos')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteVideo] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}
