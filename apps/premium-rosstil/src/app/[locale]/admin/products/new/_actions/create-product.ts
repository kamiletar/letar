'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { type ProductFormData, ProductFormSchema } from '../../_schemas/product-form.schema'

export type CreateProductResult = { success: true; redirect: string } | { success: false; error: string }

export async function createProduct(data: ProductFormData): Promise<CreateProductResult> {
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

  // 4. Найти Seller текущего пользователя
  const seller = await db.seller.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!seller) {
    return { success: false, error: 'Профиль продавца не найден. Обратитесь к администратору.' }
  }

  // 5. Создание записи с обработкой ошибок
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
    console.error('Failed to create Product:', error)

    // Обработка unique constraint violation
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Продукт с таким названием уже существует' }
    }

    return { success: false, error: 'Не удалось создать продукт. Попробуйте еще раз.' }
  }

  // 6. Возвращаем успех с редиректом
  return { success: true, redirect: '/admin/products' }
}
