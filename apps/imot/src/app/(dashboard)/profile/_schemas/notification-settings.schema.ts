import { z } from 'zod/v4'

/**
 * Схема валидации для настроек уведомлений
 */
export const NotificationSettingsSchema = z
  .object({
    emailNotifications: z.boolean(),
    notifySessionReminders: z.boolean(),
    notifyNewPractices: z.boolean(),
    notifyPracticeDiary: z.boolean(),
  })
  .strip()

export type NotificationSettingsInput = z.infer<typeof NotificationSettingsSchema>

/** Результат обновления настроек уведомлений */
export type UpdateNotificationSettingsResult = { success: true } | { success: false; error: string }
