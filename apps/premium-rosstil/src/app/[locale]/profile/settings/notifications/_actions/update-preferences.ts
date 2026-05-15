'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { revalidatePath } from 'next/cache'

interface UpdatePreferencesData {
  emailOrderStatus: boolean
  emailPromotions: boolean
  emailNewsletter: boolean
  smsOrderStatus: boolean
}

/**
 * Server action для обновления настроек уведомлений пользователя.
 *
 * Использует upsert для создания/обновления настроек:
 * - Если настройки не существуют - создает с дефолтными значениями
 * - Если существуют - обновляет только измененные поля
 */
export async function updatePreferences(data: UpdatePreferencesData): Promise<{ success: boolean; error?: string }> {
  // 1. Проверка аутентификации
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized: you must be signed in' }
  }

  const userId = session.user.id

  // 2. Получение Enhanced Prisma клиента
  const db = getEnhancedPrisma(session.user)

  try {
    // 3. Upsert настроек уведомлений
    await db.notificationPreferences.upsert({
      where: { userId },
      create: {
        userId,
        emailOrderStatus: data.emailOrderStatus,
        emailPromotions: data.emailPromotions,
        emailNewsletter: data.emailNewsletter,
        smsOrderStatus: data.smsOrderStatus,
      },
      update: {
        emailOrderStatus: data.emailOrderStatus,
        emailPromotions: data.emailPromotions,
        emailNewsletter: data.emailNewsletter,
        smsOrderStatus: data.smsOrderStatus,
      },
    })

    logger.info(`[UPDATE_PREFERENCES] User ${userId} preferences updated successfully`)

    // 4. Revalidate cache
    revalidatePath('/profile/settings/notifications')

    return { success: true }
  } catch (error) {
    logger.error('[UPDATE_PREFERENCES] Failed to update preferences:', error)
    return {
      success: false,
      error: 'Не удалось сохранить настройки. Попробуйте еще раз.',
    }
  }
}
