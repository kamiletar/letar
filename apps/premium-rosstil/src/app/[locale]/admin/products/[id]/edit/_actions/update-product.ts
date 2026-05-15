'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { type ProductFormData, ProductFormSchema } from '../../../_schemas/product-form.schema'

export type UpdateProductResult = { success: true; redirect: string } | { success: false; error: string }

export async function updateProduct(id: string, data: ProductFormData): Promise<UpdateProductResult> {
  // 1. Аутентификация — ADMIN или SELLER
  const session = await getSession()
  if (!session?.user || (session.user.role !== 'ADMIN' && session.user.role !== 'SELLER')) {
    return { success: false, error: 'Требуются права администратора или продавца' }
  }

  // 2. Валидация
  const parsed = ProductFormSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validatedData = parsed.data

  // 3. Получение DB клиента
  const db = getEnhancedPrisma(session.user)

  // 4. Обновление записи с обработкой ошибок
  try {
    await db.product.update({
      where: { id },
      data: {
        name: validatedData.name,
        description: validatedData.description,
        gender: validatedData.gender,
        categoryId: validatedData.categoryId || null,
      },
    })
  } catch (error) {
    console.error('Failed to update Product:', error)

    // Обработка unique constraint violation
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Продукт с таким названием уже существует' }
    }

    return { success: false, error: 'Не удалось обновить продукт. Попробуйте еще раз.' }
  }

  // 5. Возвращаем успех с редиректом
  return { success: true, redirect: '/admin/products' }
}
