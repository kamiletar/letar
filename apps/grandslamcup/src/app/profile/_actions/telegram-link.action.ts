'use server'

/**
 * Server actions для привязки/отвязки Telegram-аккаунта пользователя.
 *
 * Воркфлоу:
 * 1. getTelegramLinkUrlAction → возвращает {url, botUsername} для кнопки
 *    «Привязать Telegram». Username бота берётся через getMe() Telegram API
 *    (через прокси в bot.ts). Кэшируется в памяти процесса между вызовами.
 * 2. Пользователь жмёт кнопку → открывается t.me/{bot}?start=link_{userId}
 * 3. В Telegram жмёт «Старт» → бот отправляет /start link_{userId} →
 *    webhook /api/telegram/webhook записывает chat.id в User.telegramChatId
 * 4. unlinkTelegramAction → очищает chatId
 */

import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getTelegramBot } from '@/lib/telegram/bot'
import { revalidatePath } from 'next/cache'

/** Кэш username бота — getMe() обращается к Telegram API, не хочется на каждый запрос */
let cachedBotUsername: string | null = null

/** Получить username бота через Telegram getMe API */
async function getBotUsername(): Promise<string | null> {
  if (cachedBotUsername) {
    return cachedBotUsername
  }
  const bot = await getTelegramBot()
  if (!bot) {
    return null
  }
  try {
    const me = await bot.api.getMe()
    cachedBotUsername = me.username
    return cachedBotUsername
  } catch (err) {
    console.error('[telegram-link] не удалось получить username бота:', err)
    return null
  }
}

/**
 * Возвращает URL для привязки Telegram + текущий статус привязки пользователя.
 *
 * Используется на странице /profile для отрисовки кнопки «Привязать»
 * или информации «Уже привязан».
 */
export async function getTelegramLinkUrlAction() {
  const session = await requireAuth()

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true },
  })

  const botUsername = await getBotUsername()
  if (!botUsername) {
    return {
      success: false as const,
      error: 'Telegram-бот не настроен или недоступен. Обратитесь к администратору.',
    }
  }

  return {
    success: true as const,
    url: `https://t.me/${botUsername}?start=link_${session.user.id}`,
    botUsername,
    isLinked: !!user?.telegramChatId,
    chatId: user?.telegramChatId ?? null,
  }
}

/** Отвязать Telegram-аккаунт от текущего пользователя */
export async function unlinkTelegramAction() {
  const session = await requireAuth()

  await prisma.user.update({
    where: { id: session.user.id },
    data: { telegramChatId: null },
  })

  revalidatePath('/profile')
  return { success: true as const }
}
