'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function deleteItem(productId: string, itemId: string) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  try {
    await db.productItem.delete({
      where: { id: itemId },
    })
  } catch (error) {
    console.error('Failed to delete ProductItem:', error)
    throw new Error('Не удалось удалить товар', { cause: error })
  }

  revalidatePath(`/admin/products/${productId}/edit`)
}
