'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type { Decimal } from 'decimal.js'
import { revalidatePath } from 'next/cache'
import { type ItemFormData, ItemFormSchema } from '../_schemas/item-form.schema'

export type CreateItemResult = { success: true } | { success: false; error: string }

export async function createItem(productId: string, variantId: string, data: ItemFormData): Promise<CreateItemResult> {
  // 1. Аутентификация
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Требуются права администратора' }
  }

  // 2. Валидация
  const parsed = ItemFormSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validatedData = parsed.data

  // 3. Получение DB клиента
  const db = getEnhancedPrisma(session.user)

  // 4. Создание товара
  try {
    await db.productItem.create({
      data: {
        variantId,
        sizeId: validatedData.sizeId,
        price: validatedData.price as unknown as Decimal,
        availableCount: parseInt(validatedData.availableCount || '0', 10),
      },
    })
  } catch (error) {
    console.error('Failed to create ProductItem:', error)

    // Обработка unique constraint (variant + size уже существует)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return { success: false, error: 'Товар с таким размером уже существует для этого варианта' }
    }

    return { success: false, error: 'Не удалось создать товар. Попробуйте еще раз.' }
  }

  // 5. Revalidate страницы
  revalidatePath(`/admin/products/${productId}/edit`)

  return { success: true }
}
