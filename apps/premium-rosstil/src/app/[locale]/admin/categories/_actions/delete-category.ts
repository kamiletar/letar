'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function deleteCategory(categoryId: string) {
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Недостаточно прав')
  }

  const db = getEnhancedPrisma(session.user)

  // Проверяем, есть ли товары в этой категории
  const productsCount = await db.product.count({
    where: { categoryId },
  })

  if (productsCount > 0) {
    throw new Error(`Невозможно удалить категорию: в ней ${productsCount} товаров`)
  }

  await db.category.delete({
    where: { id: categoryId },
  })

  revalidatePath('/admin/categories')

  return { success: true }
}
