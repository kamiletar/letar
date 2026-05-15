'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { type ProductFormData, ProductFormSchema } from '../../../../admin/products/_schemas/product-form.schema'

export type CreateProductResult = { success: true; redirect: string } | { success: false; error: string }

/**
 * Server action для создания товара от имени продавца.
 */
export async function createSellerProduct(data: ProductFormData): Promise<CreateProductResult> {
  // 1. Аутентификация — SELLER или ADMIN
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

  // 3. Найти Seller текущего пользователя
  const seller = await db.seller.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!seller) {
    return { success: false, error: 'Профиль продавца не найден' }
  }

  // 4. Создание товара
  try {
    await db.product.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        gender: validatedData.gender,
        categoryId: validatedData.categoryId || null,
        sellerId: seller.id,
      },
    })
  } catch (error) {
    console.error('Failed to create seller product:', error)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Продукт с таким названием уже существует' }
    }
    return { success: false, error: 'Не удалось создать продукт' }
  }

  return { success: true, redirect: '/seller/products' }
}
