'use server'

import { getSession, signOut } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { logger } from '@/lib/logger'

/**
 * Server action для удаления аккаунта пользователя.
 *
 * GDPR-compliant удаление аккаунта:
 * - Удаляет пользователя из БД
 * - Cascade удаление всех связанных данных:
 *   - Cart & CartItem
 *   - Order & OrderItem
 *   - Wishlist & WishlistItem
 *   - Address
 *   - UserMeasurements
 *   - NotificationPreferences
 *   - Account (OAuth accounts)
 *   - Session
 * - Выполняет sign out
 * - Редиректит на главную страницу
 */
export async function deleteAccount(): Promise<never> {
  // 1. Проверка аутентификации
  const session = await getSession()

  if (!session?.user?.id) {
    throw new Error('Unauthorized: you must be signed in to delete your account')
  }

  const userId = session.user.id

  // 2. Получение Enhanced Prisma клиента
  const db = getEnhancedPrisma(session.user)

  try {
    // 3. Удаление пользователя (cascade удалит все связанные данные)
    await db.user.delete({
      where: { id: userId },
    })

    logger.info(`[DELETE_ACCOUNT] User ${userId} deleted successfully`)
  } catch (error) {
    logger.error('[DELETE_ACCOUNT] Failed to delete user:', error)
    throw new Error('Failed to delete account. Please try again.', { cause: error })
  }

  // 4. Sign out и редирект на главную страницу
  return signOut()
}
