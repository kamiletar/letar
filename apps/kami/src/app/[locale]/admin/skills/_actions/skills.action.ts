'use server'

import { SkillCreateFormSchema, SkillUpdateFormSchema } from '@/generated/form-schemas/Skill.form'
import {
  SkillCategoryCreateFormSchema,
  SkillCategoryUpdateFormSchema,
} from '@/generated/form-schemas/SkillCategory.form'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

type ActionResult<T = unknown> = { success: true; data: T } | { success: false; error: string }

// ========================================
// Skills CRUD
// ========================================

/**
 * Создание нового Skill
 */
export async function createSkillAction(data: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const parsed = SkillCreateFormSchema.safeParse(data)
  if (!parsed.success) {
    console.error('[createSkill] Validation error:', parsed.error)
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    const db = getEnhancedPrisma(session.user)

    const skill = await db.skill.create({
      data: parsed.data,
    })

    revalidatePath('/admin/skills')
    revalidatePath('/skills')

    return { success: true, data: { id: skill.id } }
  } catch (error) {
    console.error('[createSkill] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}

/**
 * Обновление Skill
 */
export async function updateSkillAction(id: string, data: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const parsed = SkillUpdateFormSchema.safeParse(data)
  if (!parsed.success) {
    console.error('[updateSkill] Validation error:', parsed.error)
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    const db = getEnhancedPrisma(session.user)

    const skill = await db.skill.update({
      where: { id },
      data: parsed.data,
    })

    revalidatePath('/admin/skills')
    revalidatePath('/skills')

    return { success: true, data: { id: skill.id } }
  } catch (error) {
    console.error('[updateSkill] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}

/**
 * Удаление Skill
 */
export async function deleteSkillAction(id: string): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const db = getEnhancedPrisma(session.user)

    await db.skill.delete({
      where: { id },
    })

    revalidatePath('/admin/skills')
    revalidatePath('/skills')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteSkill] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}

// ========================================
// SkillCategory CRUD
// ========================================

/**
 * Создание новой SkillCategory
 */
export async function createSkillCategoryAction(data: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const parsed = SkillCategoryCreateFormSchema.safeParse(data)
  if (!parsed.success) {
    console.error('[createSkillCategory] Validation error:', parsed.error)
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    const db = getEnhancedPrisma(session.user)

    const category = await db.skillCategory.create({
      data: parsed.data,
    })

    revalidatePath('/admin/skills')
    revalidatePath('/admin/skills/categories')
    revalidatePath('/skills')

    return { success: true, data: { id: category.id } }
  } catch (error) {
    console.error('[createSkillCategory] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}

/**
 * Обновление SkillCategory
 */
export async function updateSkillCategoryAction(id: string, data: unknown): Promise<ActionResult<{ id: string }>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const parsed = SkillCategoryUpdateFormSchema.safeParse(data)
  if (!parsed.success) {
    console.error('[updateSkillCategory] Validation error:', parsed.error)
    return { success: false, error: 'VALIDATION_ERROR' }
  }

  try {
    const db = getEnhancedPrisma(session.user)

    const category = await db.skillCategory.update({
      where: { id },
      data: parsed.data,
    })

    revalidatePath('/admin/skills')
    revalidatePath('/admin/skills/categories')
    revalidatePath('/skills')

    return { success: true, data: { id: category.id } }
  } catch (error) {
    console.error('[updateSkillCategory] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}

/**
 * Удаление SkillCategory
 */
export async function deleteSkillCategoryAction(id: string): Promise<ActionResult<void>> {
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const db = getEnhancedPrisma(session.user)

    // Проверяем, есть ли навыки в этой категории
    const skillsCount = await db.skill.count({
      where: { categoryId: id },
    })

    if (skillsCount > 0) {
      return {
        success: false,
        error: `Нельзя удалить категорию с ${skillsCount} навыками. Сначала удалите или перенесите навыки.`,
      }
    }

    await db.skillCategory.delete({
      where: { id },
    })

    revalidatePath('/admin/skills')
    revalidatePath('/admin/skills/categories')
    revalidatePath('/skills')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('[deleteSkillCategory] Error:', error)
    return { success: false, error: 'DATABASE_ERROR' }
  }
}
