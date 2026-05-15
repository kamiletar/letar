'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { type CategoryFormData, CategoryFormSchema } from '../_schemas/category-form.schema'

export type CreateCategoryResult = { success: true; redirect: string } | { success: false; error: string }

export async function createCategory(data: CategoryFormData): Promise<CreateCategoryResult> {
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Требуются права администратора' }
  }

  // Валидация
  const parsed = CategoryFormSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validatedData = parsed.data
  const db = getEnhancedPrisma(session.user)

  try {
    await db.category.create({
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        sortOrder: validatedData.sortOrder,
      },
    })
  } catch (error) {
    console.error('Failed to create Category:', error)

    // Обработка ошибки уникальности
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Категория с таким названием или slug уже существует' }
    }

    return { success: false, error: 'Не удалось создать категорию. Попробуйте еще раз.' }
  }

  return { success: true, redirect: '/admin/categories' }
}
