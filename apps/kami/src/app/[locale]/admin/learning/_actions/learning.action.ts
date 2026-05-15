'use server'

import { LearningItemCreateFormSchema, LearningItemUpdateFormSchema } from '@/generated/form-schemas/LearningItem.form'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string }

/**
 * Создание нового LearningItem
 */
export async function createLearningItemAction(data: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const parsed = LearningItemCreateFormSchema.safeParse(data)
  if (!parsed.success) {
    console.error('[createLearningItem] Validation error:', parsed.error)
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    const db = getEnhancedPrisma(session.user)

    const item = await db.learningItem.create({
      data: {
        ...parsed.data,
        // Преобразование дат из строк в Date
        startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : null,
        completedAt: parsed.data.completedAt ? new Date(parsed.data.completedAt) : null,
      },
    })

    revalidatePath('/admin/learning')
    revalidatePath('/learning')

    return { success: true, data: { id: item.id } }
  } catch (error) {
    console.error('[createLearningItem] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}

/**
 * Обновление LearningItem
 */
export async function updateLearningItemAction(id: string, data: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const parsed = LearningItemUpdateFormSchema.safeParse(data)
  if (!parsed.success) {
    console.error('[updateLearningItem] Validation error:', parsed.error)
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    const db = getEnhancedPrisma(session.user)

    const item = await db.learningItem.update({
      where: { id },
      data: {
        ...parsed.data,
        // Преобразование дат из строк в Date (если переданы)
        startedAt:
          parsed.data.startedAt !== undefined
            ? parsed.data.startedAt
              ? new Date(parsed.data.startedAt)
              : null
            : undefined,
        completedAt:
          parsed.data.completedAt !== undefined
            ? parsed.data.completedAt
              ? new Date(parsed.data.completedAt)
              : null
            : undefined,
      },
    })

    revalidatePath('/admin/learning')
    revalidatePath('/learning')

    return { success: true, data: { id: item.id } }
  } catch (error) {
    console.error('[updateLearningItem] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}

/**
 * Удаление LearningItem
 */
export async function deleteLearningItemAction(id: string): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const db = getEnhancedPrisma(session.user)

    await db.learningItem.delete({
      where: { id },
    })

    revalidatePath('/admin/learning')
    revalidatePath('/learning')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteLearningItem] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}
