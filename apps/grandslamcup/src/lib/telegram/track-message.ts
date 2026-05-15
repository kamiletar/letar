/**
 * Трекинг отправленных Telegram-сообщений для аналитики реакций.
 *
 * @module track-message
 */

import { prisma } from '@/lib/db'

/** Тип сообщения для трекинга */
export type TelegramMessageType = 'announcement' | 'result' | 'halfTime' | 'schedule' | 'tourSummary' | 'voting'

/** Сохранить отправленное сообщение для трекинга реакций */
export async function trackTelegramMessage(params: {
  messageId: number
  chatId: string
  type: TelegramMessageType
  matchId?: string
  tourId?: string
}): Promise<void> {
  try {
    await prisma.telegramMessage.create({
      data: {
        messageId: params.messageId,
        chatId: String(params.chatId),
        type: params.type,
        matchId: params.matchId ?? null,
        tourId: params.tourId ?? null,
      },
    })
  } catch (err) {
    // Не блокируем отправку из-за ошибки трекинга
    console.error('[track-message] ошибка:', err)
  }
}
