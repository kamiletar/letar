'use server'

import { redirect } from '@/i18n/server-redirect'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

export async function deleteProduct(id: string) {
  // 1. Аутентификация
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  // 2. Получение DB клиента
  const db = getEnhancedPrisma(session.user)

  // 3. Удаление продукта (каскадно удалит все связанные данные благодаря onDelete: Cascade)
  try {
    await db.product.delete({
      where: { id },
    })
  } catch (error) {
    console.error('Failed to delete Product:', error)
    throw new Error('Не удалось удалить продукт', { cause: error })
  }

  // 4. Редирект после успеха
  return redirect('/admin/products')
}
