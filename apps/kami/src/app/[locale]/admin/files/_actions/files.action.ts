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

/** Обновить категорию/метки файла (inline-редактирование прямо из таблицы, как у Link) */
export async function updateFileClassificationAction(input: unknown): Promise<ActionResult<void>> {
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
    await db.uploadedFile.update({
      where: { id: parsed.data.id },
      data: { category: parsed.data.category || null, tags: parsed.data.tags },
    })
    revalidatePath('/admin/files')
    return { success: true, data: undefined }
  } catch (error) {
    console.error('[updateFileClassification] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}
