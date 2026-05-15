'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { type CategoryFormData, CategoryFormSchema } from '../_schemas/category-form.schema'

export type UpdateCategoryResult = { success: true; redirect: string } | { success: false; error: string }

export async function updateCategory(categoryId: string, data: CategoryFormData): Promise<UpdateCategoryResult> {
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
    await db.category.update({
      where: { id: categoryId },
      data: {
        name: validatedData.name,
        slug: validatedData.slug,
        sortOrder: validatedData.sortOrder,
      },
    })
  } catch (error) {
    console.error('Failed to update Category:', error)

    // Обработка ошибки уникальности
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Категория с таким названием или slug уже существует' }
    }

    return { success: false, error: 'Не удалось обновить категорию. Попробуйте еще раз.' }
  }

  return { success: true, redirect: '/admin/categories' }
}
