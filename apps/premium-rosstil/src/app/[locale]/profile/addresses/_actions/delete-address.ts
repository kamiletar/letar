'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Server action для удаления адреса.
 */
export async function deleteAddress(addressId: string) {
  // Проверка авторизации
  const session = await getSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  try {
    // Удаляем адрес (ZenStack автоматически проверит владельца)
    await db.address.delete({
      where: { id: addressId },
    })

    // Инвалидируем кэш страницы адресов
    revalidatePath('/profile/addresses')

    return { success: true }
  } catch (error) {
    console.error('Failed to delete address:', error)
    throw new Error('Не удалось удалить адрес', { cause: error })
  }
}
