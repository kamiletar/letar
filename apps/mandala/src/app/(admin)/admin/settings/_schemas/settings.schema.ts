/**
 * Zod схема для настроек приложения
 */

import { z } from 'zod/v4'

export const TelegramSettingsSchema = z
  .object({
    telegramEnabled: z.boolean(),
    telegramBotToken: z
      .string()
      .optional()
      .transform((val) => val || undefined),
    telegramChatId: z
      .string()
      .optional()
      .transform((val) => val || undefined),
  })
  .strip()

export type TelegramSettingsInput = z.infer<typeof TelegramSettingsSchema>
