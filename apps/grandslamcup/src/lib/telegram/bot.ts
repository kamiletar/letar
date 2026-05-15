/**
 * Инфраструктура Telegram-бота: инстанс и chatId.
 */

import { prisma } from '@/lib/db'
import type { Bot } from 'grammy'

/** Получить Bot-инстанс из глобального конфига */
export async function getTelegramBot(): Promise<Bot | null> {
  const config = await prisma.telegramConfig.findUnique({ where: { id: 'default' } })
  if (!config?.botToken || !config.enabled) {
    return null
  }
  // Динамический импорт чтобы не тянуть grammy в каждый модуль
  const { Bot: BotClass } = await import('grammy')
  // api.telegram.org заблокирован/нестабилен с РФ-хостинга — проксируем через mail.letar.best.
  // grammy подставит apiRoot вместо https://api.telegram.org для всех bot.api.* вызовов.
  const apiRoot = process.env.TELEGRAM_API_ROOT
  return new BotClass(config.botToken, apiRoot ? { client: { apiRoot } } : undefined)
}

/** Получить chatId канала для конкретного матча (через город) */
export async function getChatIdForMatch(matchId: string): Promise<string | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      tour: { include: { round: { include: { season: { include: { city: true } } } } } },
      season: { include: { city: true } },
    },
  })
  if (!match) {
    return null
  }

  // Для регулярных — через tour.round.season.city, для товарищеских — через season.city
  const city = match.tour?.round?.season?.city ?? match.season?.city
  return city?.telegramChatId ?? null
}

/** Результат отправки сообщения в Telegram */
export interface SendResult {
  success: boolean
  error?: string
}
