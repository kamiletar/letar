'use server'

/**
 * Обновление настроек приложения
 */

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { type TelegramSettingsInput, TelegramSettingsSchema } from '../_schemas/settings.schema'

export interface MutationResult {
  success: boolean
  error?: string
}

export async function updateSettingsAction(input: TelegramSettingsInput): Promise<MutationResult> {
  await requireAdmin()

  const parsed = TelegramSettingsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const { telegramEnabled, telegramBotToken, telegramChatId } = parsed.data

  try {
    // Получаем текущие настройки для merge токена
    const current = await prisma.appSettings.findUnique({
      where: { id: 'default' },
      select: { telegramBotToken: true },
    })

    // Если токен не изменился (маскированное значение), сохраняем старый
    const finalToken = telegramBotToken?.startsWith('***') ? current?.telegramBotToken : telegramBotToken

    await prisma.appSettings.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        telegramEnabled,
        telegramBotToken: finalToken,
        telegramChatId,
      },
      update: {
        telegramEnabled,
        telegramBotToken: finalToken,
        telegramChatId,
      },
    })

    revalidatePath('/admin/settings')
    return { success: true }
  } catch (error) {
    console.error('Failed to update settings:', error)
    return { success: false, error: 'Не удалось сохранить настройки' }
  }
}
