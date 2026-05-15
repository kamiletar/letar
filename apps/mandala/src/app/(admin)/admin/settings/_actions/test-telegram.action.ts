'use server'

/**
 * Тестирование Telegram уведомлений
 */

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendTestNotification } from '@/lib/telegram'

export interface MutationResult {
  success: boolean
  error?: string
}

export async function testTelegramAction(): Promise<MutationResult> {
  await requireAdmin()

  const settings = await prisma.appSettings.findUnique({
    where: { id: 'default' },
    select: {
      telegramEnabled: true,
      telegramBotToken: true,
      telegramChatId: true,
    },
  })

  if (!settings?.telegramEnabled) {
    return { success: false, error: 'Telegram уведомления отключены' }
  }

  if (!settings.telegramBotToken || !settings.telegramChatId) {
    return { success: false, error: 'Не настроен токен или Chat ID' }
  }

  const result = await sendTestNotification(settings.telegramBotToken, settings.telegramChatId)

  if (result.success) {
    return { success: true }
  }

  return { success: false, error: result.error }
}
