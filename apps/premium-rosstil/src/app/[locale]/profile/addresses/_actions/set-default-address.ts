'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Server action для установки адреса по умолчанию.
 * Снимает флаг isDefault со всех адресов пользователя и устанавливает его для выбранного.
 */
export async function setDefaultAddress(addressId: string) {
  // Проверка авторизации
  const session = await getSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  try {
    // Сначала снимаем флаг isDefault со всех адресов пользователя
    await db.address.updateMany({
      where: { userId: session.user.id },
      data: { isDefault: false },
    })

    // Устанавливаем выбранный адрес как default
    await db.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    })

    // Инвалидируем кэш страницы адресов и checkout
    revalidatePath('/profile/addresses')
    revalidatePath('/checkout')

    return { success: true }
  } catch (error) {
    console.error('Failed to set default address:', error)
    throw new Error('Не удалось установить адрес по умолчанию', { cause: error })
  }
}
