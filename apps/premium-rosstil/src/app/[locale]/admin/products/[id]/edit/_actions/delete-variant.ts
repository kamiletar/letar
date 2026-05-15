'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function deleteVariant(productId: string, variantId: string) {
  // 1. Аутентификация
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  // 2. Получение DB клиента
  const db = getEnhancedPrisma(session.user)

  // 3. Удаление варианта (каскадно удалит items и images)
  try {
    await db.productVariant.delete({
      where: { id: variantId },
    })
  } catch (error) {
    console.error('Failed to delete ProductVariant:', error)
    throw new Error('Не удалось удалить вариант', { cause: error })
  }

  // 4. Revalidate страницы
  revalidatePath(`/admin/products/${productId}/edit`)
}
