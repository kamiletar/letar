'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { type VariantFormData, VariantFormSchema } from '../_schemas/variant-form.schema'

export type UpdateVariantResult = { success: true } | { success: false; error: string }

export async function updateVariant(
  productId: string,
  variantId: string,
  data: VariantFormData
): Promise<UpdateVariantResult> {
  // 1. Аутентификация
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Требуются права администратора' }
  }

  // 2. Валидация
  const parsed = VariantFormSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validatedData = parsed.data

  // 3. Получение DB клиента
  const db = getEnhancedPrisma(session.user)

  // 4. Обновление варианта
  try {
    await db.productVariant.update({
      where: { id: variantId },
      data: {
        color: validatedData.color,
        composition: validatedData.composition,
      },
    })
  } catch (error) {
    console.error('Failed to update ProductVariant:', error)
    return { success: false, error: 'Не удалось обновить вариант. Попробуйте еще раз.' }
  }

  // 5. Revalidate страницы
  revalidatePath(`/admin/products/${productId}/edit`)

  return { success: true }
}
