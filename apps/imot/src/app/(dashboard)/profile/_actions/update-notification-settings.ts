'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import {
  type NotificationSettingsInput,
  NotificationSettingsSchema,
  type UpdateNotificationSettingsResult,
} from '../_schemas/notification-settings.schema'

/**
 * Server action для обновления настроек уведомлений пользователя
 */
export async function updateNotificationSettings(
  data: NotificationSettingsInput
): Promise<UpdateNotificationSettingsResult> {
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  const parsed = NotificationSettingsSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const db = getEnhancedPrisma(session.user)

  try {
    await db.user.update({
      where: { id: session.user.id },
      data: {
        emailNotifications: parsed.data.emailNotifications,
        notifySessionReminders: parsed.data.notifySessionReminders,
        notifyNewPractices: parsed.data.notifyNewPractices,
        notifyPracticeDiary: parsed.data.notifyPracticeDiary,
      },
    })

    revalidatePath('/profile')

    return { success: true }
  } catch (error) {
    console.error('Failed to update notification settings:', error)
    return { success: false, error: 'Не удалось обновить настройки уведомлений.' }
  }
}
