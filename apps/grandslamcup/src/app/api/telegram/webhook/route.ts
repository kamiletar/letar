/**
 * Telegram Bot Webhook — обработка входящих сообщений.
 *
 * Обрабатывает:
 * - /start link_{userId} — привязка Telegram аккаунта к пользователю
 *
 * Регистрация webhook:
 * POST https://api.telegram.org/bot{TOKEN}/setWebhook?url={SITE_URL}/api/telegram/webhook&secret_token={SECRET}
 */

import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

/** Проверка секрета webhook */
function validateSecret(request: Request): boolean {
  if (!WEBHOOK_SECRET) return true // Если секрет не настроен — пропускаем
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
  return secret === WEBHOOK_SECRET
}

export async function POST(request: Request) {
  if (!validateSecret(request)) {
    console.warn('[telegram-webhook] forbidden: secret mismatch')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const update = await request.json()
    // Диагностическое логирование — список ключей update верхнего уровня + короткое описание.
    // Telegram шлёт один из типов: message, edited_message, channel_post, edited_channel_post,
    // message_reaction, message_reaction_count, callback_query, и т.д.
    const keys = Object.keys(update).filter((k) => k !== 'update_id')
    console.log('[telegram-webhook] update received:', {
      update_id: update.update_id,
      keys,
      message_text: update.message?.text?.slice(0, 80),
      reaction_chat: update.message_reaction_count?.chat?.id,
      reaction_msg: update.message_reaction_count?.message_id,
      reactions: update.message_reaction_count?.reactions?.length,
    })

    // Обработка команды /start
    if (update.message?.text?.startsWith('/start')) {
      await handleStartCommand(update.message)
    }

    // Обработка реакций на сообщения бота
    if (update.message_reaction_count) {
      await handleReactionCount(update.message_reaction_count)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[telegram-webhook] ошибка:', err)
    return NextResponse.json({ ok: true }) // Всегда 200 чтобы Telegram не ретраил
  }
}

/** Обработка /start link_{userId} — привязка Telegram аккаунта */
async function handleStartCommand(message: {
  from: { id: number; first_name: string }
  text: string
  chat: { id: number }
}) {
  const text = message.text.trim()
  const linkMatch = text.match(/^\/start\s+link_(.+)$/)

  if (!linkMatch) {
    // Обычный /start без параметра — приветствие
    const { getTelegramBot } = await import('@/lib/telegram/bot')
    const bot = await getTelegramBot()
    if (bot) {
      await bot.api.sendMessage(
        message.chat.id,
        `Привет, ${message.from.first_name}! 👋\n\nЯ бот Кубка Большого Слэма. Для привязки аккаунта используйте ссылку из вашего профиля на сайте.`
      )
    }
    return
  }

  const userId = linkMatch[1]

  // Проверяем что пользователь существует
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, telegramChatId: true },
  })

  if (!user) {
    const { getTelegramBot } = await import('@/lib/telegram/bot')
    const bot = await getTelegramBot()
    if (bot) {
      await bot.api.sendMessage(message.chat.id, '❌ Пользователь не найден. Проверьте ссылку.')
    }
    return
  }

  // Привязываем chatId
  const chatId = String(message.chat.id)
  await prisma.user.update({
    where: { id: userId },
    data: { telegramChatId: chatId },
  })

  const { getTelegramBot } = await import('@/lib/telegram/bot')
  const bot = await getTelegramBot()
  if (bot) {
    await bot.api.sendMessage(
      message.chat.id,
      `✅ Telegram привязан к аккаунту ${
        user.name ?? 'пользователя'
      }!\n\nТеперь вы будете получать личные уведомления о матчах.`
    )
  }
}

/** Обработка агрегированных реакций (message_reaction_count update) */
async function handleReactionCount(reactionCount: {
  chat: { id: number }
  message_id: number
  reactions: Array<{ type: { type: string; emoji?: string }; total_count: number }>
}) {
  const chatId = String(reactionCount.chat.id)
  const messageId = reactionCount.message_id

  // Ищем сообщение в нашей БД
  const tgMessage = await prisma.telegramMessage.findFirst({
    where: { chatId, messageId },
  })
  if (!tgMessage) {
    console.warn('[telegram-webhook] reaction для несуществующего message:', { chatId, messageId })
    return // Не наше сообщение
  }
  console.log('[telegram-webhook] reaction найдена для message:', {
    id: tgMessage.id,
    chatId,
    messageId,
    reactions: reactionCount.reactions.map((r) => `${r.type.emoji ?? r.type.type}×${r.total_count}`).join(', '),
  })

  // Обновляем реакции (upsert каждую)
  for (const r of reactionCount.reactions) {
    if (r.type.type !== 'emoji' || !r.type.emoji) continue

    await prisma.telegramReaction.upsert({
      where: {
        telegramMessageId_emoji: {
          telegramMessageId: tgMessage.id,
          emoji: r.type.emoji,
        },
      },
      create: {
        telegramMessageId: tgMessage.id,
        emoji: r.type.emoji,
        count: r.total_count,
      },
      update: {
        count: r.total_count,
      },
    })
  }
}
