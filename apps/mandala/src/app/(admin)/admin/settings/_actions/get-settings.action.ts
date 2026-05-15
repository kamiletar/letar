'use server'

/**
 * Получение настроек приложения
 */

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'

export interface SettingsData {
  telegramEnabled: boolean
  telegramBotToken: string
  telegramChatId: string
  /** Флаг: токен настроен (для UI) */
  hasToken: boolean
}

export async function getSettingsAction(): Promise<SettingsData> {
  await requireAdmin()

  const settings = await prisma.appSettings.findUnique({
    where: { id: 'default' },
    select: {
      telegramEnabled: true,
      telegramBotToken: true,
      telegramChatId: true,
    },
  })

  // Маскируем токен для отображения
  return {
    telegramEnabled: settings?.telegramEnabled ?? false,
    telegramBotToken: settings?.telegramBotToken ? '***' + settings.telegramBotToken.slice(-4) : '',
    telegramChatId: settings?.telegramChatId ?? '',
    hasToken: !!settings?.telegramBotToken,
  }
}
