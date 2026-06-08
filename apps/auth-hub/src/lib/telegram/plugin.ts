/**
 * Кастомный Better Auth плагин для Telegram-авторизации (Этап 6.6 PLAN.md).
 *
 * Флоу: сайт генерит one-time token → ссылка t.me/<bot>?start=<token> →
 * пользователь нажимает START в боте → бот получает webhook-update и связывает
 * Telegram-identity с токеном → фронт поллит /status → сессия создаётся.
 *
 * Эндпоинты (доступны по /api/auth/telegram/...):
 *   POST /telegram/start    — создать токен, вернуть ссылку на бота
 *   POST /telegram/webhook  — получить Telegram-update от бота (вызывает Telegram)
 *   POST /telegram/status   — опросить статус токена; при успехе создаёт сессию
 *
 * Переменные окружения:
 *   TELEGRAM_BOT_TOKEN       — токен бота от @BotFather (обязателен)
 *   TELEGRAM_BOT_USERNAME    — @username бота без @ (обязателен)
 *   TELEGRAM_WEBHOOK_SECRET  — секрет для X-Telegram-Bot-Api-Secret-Token (рекомендован)
 */

import { createAuthEndpoint, getSessionFromCtx } from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'
import type { BetterAuthPlugin } from 'better-auth/types'
import crypto from 'node:crypto'
import { z } from 'zod/v4'

// Telegram update — структура webhook payload
interface TelegramFrom {
  id: number
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: TelegramFrom
    chat: { id: number; type: string }
    text?: string
    date: number
  }
}

// Тип записи TelegramToken из адаптера
interface TelegramTokenRecord {
  id: string
  token: string
  telegramId: string | null
  name: string | null
  username: string | null
  photoUrl: string | null
  userId: string | null
  expiresAt: Date | string
  createdAt: Date | string
}

export function telegramPlugin(): BetterAuthPlugin {
  return {
    id: 'telegram',

    // Better Auth schema — описывает поля для адаптера БД
    schema: {
      telegramToken: {
        fields: {
          token: { type: 'string', required: true },
          telegramId: { type: 'string', required: false },
          name: { type: 'string', required: false },
          username: { type: 'string', required: false },
          photoUrl: { type: 'string', required: false },
          userId: {
            type: 'string',
            required: false,
            references: { model: 'user', field: 'id' },
          },
          expiresAt: { type: 'date', required: true },
          createdAt: { type: 'date', required: false },
        },
      },
    },

    endpoints: {
      // ─── /telegram/start ─────────────────────────────────────────────────────
      // Генерирует one-time токен и возвращает ссылку на бота.
      // Вызывается с фронта когда пользователь нажимает «Войти через Telegram».
      telegramStart: createAuthEndpoint('/telegram/start', { method: 'POST', requireHeaders: true }, async (ctx) => {
        const botUsername = process.env.TELEGRAM_BOT_USERNAME
        const botToken = process.env.TELEGRAM_BOT_TOKEN
        if (!botUsername || !botToken) {
          return ctx.json({ error: 'Telegram не настроен' }, { status: 503 })
        }

        const token = crypto.randomBytes(32).toString('hex')
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 минут

        await ctx.context.adapter.create({
          model: 'telegramToken',
          data: { token, expiresAt },
        })

        const url = `https://t.me/${botUsername}?start=${token}`
        return ctx.json({ token, url })
      }),

      // ─── /telegram/webhook ───────────────────────────────────────────────────
      // Получает Telegram-update от webhook.
      // Telegram вызывает этот эндпоинт при каждом сообщении боту.
      // Обрабатывает только /start <token> в приватном чате.
      telegramWebhook: createAuthEndpoint('/telegram/webhook', { method: 'POST' }, async (ctx) => {
        // Валидация секрета — защищает от поддельных вызовов
        const secretHeader = ctx.headers?.get('x-telegram-bot-api-secret-token')
        const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
        if (expectedSecret && secretHeader !== expectedSecret) {
          return ctx.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const update = ctx.body as TelegramUpdate

        // Обрабатываем только /start <token> в приватном чате
        const message = update?.message
        if (!message || message.chat.type !== 'private' || !message.text?.startsWith('/start ')) {
          return ctx.json({ ok: true })
        }

        const token = message.text.slice('/start '.length).trim()
        // hex(32) → 64 символа; любые другие токены игнорируем
        if (!token || token.length !== 64) {
          return ctx.json({ ok: true })
        }

        const tgFrom = message.from
        const telegramId = String(tgFrom.id)
        const name = [tgFrom.first_name, tgFrom.last_name].filter(Boolean).join(' ') || tgFrom.username
          || `Telegram ${telegramId}`

        // Ищем токен в БД
        const records = (await ctx.context.adapter.findMany({
          model: 'telegramToken',
          where: [{ field: 'token', value: token }],
        })) as TelegramTokenRecord[]

        const tokenRecord = records[0]

        if (!tokenRecord || tokenRecord.userId || new Date() > new Date(tokenRecord.expiresAt)) {
          await sendBotMessage(tgFrom.id, '❌ Ссылка недействительна или истекла. Запросите новую на сайте.')
          return ctx.json({ ok: true })
        }

        // Ищем существующего пользователя по telegramId через таблицу account
        const accounts = (await ctx.context.adapter.findMany({
          model: 'account',
          where: [
            { field: 'providerId', value: 'telegram' },
            { field: 'accountId', value: telegramId },
          ],
        })) as Array<{ userId: string }>

        let userId: string

        if (accounts.length > 0) {
          userId = accounts[0].userId
        } else {
          // Создаём нового пользователя с email-заглушкой
          // (аналог VK: `${id}@vk.com` → `${telegramId}@telegram.local`)
          const email = `${telegramId}@telegram.local`

          const existingUsers = (await ctx.context.adapter.findMany({
            model: 'user',
            where: [{ field: 'email', value: email }],
          })) as Array<{ id: string }>

          if (existingUsers.length > 0) {
            userId = existingUsers[0].id
          } else {
            const newUser = (await ctx.context.adapter.create({
              model: 'user',
              data: {
                email,
                name,
                emailVerified: true,
                image: null,
                roles: ['USER'],
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            })) as { id: string }
            userId = newUser.id
          }

          // Создаём Account для providerId='telegram'
          await ctx.context.adapter.create({
            model: 'account',
            data: {
              userId,
              accountId: telegramId,
              providerId: 'telegram',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          })
        }

        // Связываем токен с userId (фронт увидит это через /status)
        await ctx.context.adapter.update({
          model: 'telegramToken',
          where: [{ field: 'id', value: tokenRecord.id }],
          update: { telegramId, name, username: tgFrom.username ?? null, userId },
        })

        await sendBotMessage(tgFrom.id, `✅ Вы вошли как ${name}. Вернитесь в браузер.`)

        return ctx.json({ ok: true })
      }),

      // ─── /telegram/status ────────────────────────────────────────────────────
      // Фронт поллит этот эндпоинт каждые 2 сек.
      // Когда userId появился → создаём сессию, ставим cookie, возвращаем success.
      telegramStatus: createAuthEndpoint(
        '/telegram/status',
        {
          method: 'POST',
          requireHeaders: true,
          body: z.object({ token: z.string() }),
        },
        async (ctx) => {
          const { token } = ctx.body

          const records = (await ctx.context.adapter.findMany({
            model: 'telegramToken',
            where: [{ field: 'token', value: token }],
          })) as TelegramTokenRecord[]

          const tokenRecord = records[0]

          if (!tokenRecord) {
            return ctx.json({ status: 'invalid' } as const)
          }

          if (new Date() > new Date(tokenRecord.expiresAt)) {
            return ctx.json({ status: 'expired' } as const)
          }

          if (!tokenRecord.userId) {
            return ctx.json({ status: 'pending' } as const)
          }

          // Нашли userId — создаём сессию Better Auth
          const userRecord = await ctx.context.internalAdapter.findUserById(tokenRecord.userId)
          if (!userRecord) {
            return ctx.json({ status: 'error', message: 'Пользователь не найден' } as const)
          }

          const newSession = await ctx.context.internalAdapter.createSession(tokenRecord.userId)
          if (!newSession) {
            return ctx.json({ status: 'error', message: 'Ошибка создания сессии' } as const)
          }

          // Удаляем одноразовый токен
          await ctx.context.adapter.delete({
            model: 'telegramToken',
            where: [{ field: 'id', value: tokenRecord.id }],
          })

          // Ставим session cookie (паттерн из passkey-плагина)
          await setSessionCookie(ctx, { session: newSession, user: userRecord })

          return ctx.json(
            {
              status: 'success',
              user: {
                id: userRecord.id,
                email: userRecord.email,
                name: userRecord.name,
              },
            } as const,
          )
        },
      ),

      // ─── /telegram/unlink ────────────────────────────────────────────────────
      // Отвязать Telegram-аккаунт (удаляет account запись providerId='telegram').
      telegramUnlink: createAuthEndpoint('/telegram/unlink', { method: 'POST', requireHeaders: true }, async (ctx) => {
        const session = await getSessionFromCtx(ctx)
        if (!session?.user) {
          return ctx.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const accounts = (await ctx.context.adapter.findMany({
          model: 'account',
          where: [
            { field: 'userId', value: session.user.id },
            { field: 'providerId', value: 'telegram' },
          ],
        })) as Array<{ id: string }>

        if (!accounts.length) {
          return ctx.json({ error: 'Telegram не привязан' }, { status: 404 })
        }

        await ctx.context.adapter.delete({
          model: 'account',
          where: [{ field: 'id', value: accounts[0].id }],
        })

        return ctx.json({ unlinked: true })
      }),
    },
  }
}

// Отправить сообщение через Bot API
async function sendBotMessage(chatId: number, text: string): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    return
  }
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
  } catch {
    // Не падаем при сетевых ошибках — webhook должен возвращать 200
  }
}
