'use server'

import { ProjectCreateFormSchema, ProjectUpdateFormSchema } from '@/generated/form-schemas/Project.form'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string }

/**
 * Создание нового проекта
 */
export async function createProjectAction(data: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const parsed = ProjectCreateFormSchema.safeParse(data)
  if (!parsed.success) {
    console.error('[createProject] Validation error:', parsed.error)
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    const db = getEnhancedPrisma(session.user)

    const project = await db.project.create({
      data: parsed.data,
    })

    revalidatePath('/admin/projects')
    revalidatePath('/projects')

    return { success: true, data: { id: project.id } }
  } catch (error) {
    console.error('[createProject] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}

/**
 * Обновление проекта
 */
export async function updateProjectAction(id: string, data: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const parsed = ProjectUpdateFormSchema.safeParse(data)
  if (!parsed.success) {
    console.error('[updateProject] Validation error:', parsed.error)
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    const db = getEnhancedPrisma(session.user)

    const project = await db.project.update({
      where: { id },
      data: parsed.data,
    })

    revalidatePath('/admin/projects')
    revalidatePath('/projects')

    return { success: true, data: { id: project.id } }
  } catch (error) {
    console.error('[updateProject] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}

/**
 * Удаление проекта
 */
export async function deleteProjectAction(id: string): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const db = getEnhancedPrisma(session.user)

    await db.project.delete({
      where: { id },
    })

    revalidatePath('/admin/projects')
    revalidatePath('/projects')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteProject] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}
