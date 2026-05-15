'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { type ProductFormData, ProductFormSchema } from '../../../../../admin/products/_schemas/product-form.schema'

export type UpdateProductResult = { success: true; redirect: string } | { success: false; error: string }

/**
 * Server action для обновления товара продавцом.
 * ZenStack policies проверят что товар принадлежит этому продавцу.
 */
export async function updateSellerProduct(id: string, data: ProductFormData): Promise<UpdateProductResult> {
  // 1. Аутентификация
  const session = await getSession()
  if (!session?.user || (session.user.role !== 'SELLER' && session.user.role !== 'ADMIN')) {
    return { success: false, error: 'Требуются права продавца' }
  }

  // 2. Валидация
  const parsed = ProductFormSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validatedData = parsed.data
  const db = getEnhancedPrisma(session.user)

  // 3. Обновление (ZenStack policies проверят владельца)
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
    console.error('Failed to update seller product:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Продукт с таким названием уже существует' }
    }
    return { success: false, error: 'Не удалось обновить продукт' }
  }

  return { success: true, redirect: '/seller/products' }
}
