'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type { Decimal } from 'decimal.js'
import { revalidatePath } from 'next/cache'
import { type ItemFormData, ItemFormSchema } from '../_schemas/item-form.schema'

export type UpdateItemResult = { success: true } | { success: false; error: string }

export async function updateItem(productId: string, itemId: string, data: ItemFormData): Promise<UpdateItemResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Требуются права администратора' }
  }

  const parsed = ItemFormSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validatedData = parsed.data
  const db = getEnhancedPrisma(session.user)

  try {
    await db.productItem.update({
      where: { id: itemId },
      data: {
        sizeId: validatedData.sizeId,
        price: validatedData.price as unknown as Decimal,
        availableCount: parseInt(validatedData.availableCount || '0', 10),
      },
    })
  } catch (error) {
    console.error('Failed to update ProductItem:', error)
    return { success: false, error: 'Не удалось обновить товар. Попробуйте еще раз.' }
  }

  revalidatePath(`/admin/products/${productId}/edit`)
  return { success: true }
}
