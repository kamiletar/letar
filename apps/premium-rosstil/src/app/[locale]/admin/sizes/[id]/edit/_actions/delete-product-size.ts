'use server'

import { redirect } from '@/i18n/server-redirect'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

/**
 * Server action for deleting a ProductSize record.
 * Checks if the size is in use by any ProductItem before deletion.
 */
// Тип размера с подсчётом товаров
type SizeWithItemCount = {
  id: string
  _count: { productItems: number }
}

export async function deleteProductSize(id: string) {
  // 1. Authenticate and check admin role
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  if (session.user.role !== 'ADMIN') {
    throw new Error('Forbidden: Admin access required')
  }

  // 2. Get enhanced Prisma client with ZenStack policies
  const db = getEnhancedPrisma(session.user)

  try {
    // 3. Check if the size is used in any ProductItem
    const size = (await db.productSize.findUnique({
      where: { id },
      include: {
        _count: {
          select: { items: true },
        },
      },
    })) as unknown as SizeWithItemCount | null

    if (!size) {
      throw new Error('ProductSize not found')
    }

    // 4. Prevent deletion if size is in use
    if (size._count.productItems > 0) {
      throw new Error(`Невозможно удалить размер. Он используется в ${size._count.productItems} товарах.`)
    }

    // 5. Delete the size
    await db.productSize.delete({
      where: { id },
    })
  } catch (error) {
    console.error('Failed to delete ProductSize:', error)

    // Re-throw the error to be caught by the UI
    if (error instanceof Error) {
      throw error
    }

    throw new Error('Не удалось удалить размер. Попробуйте еще раз.', { cause: error })
  }

  // 6. Redirect to list page on success
  return redirect('/admin/sizes')
}
