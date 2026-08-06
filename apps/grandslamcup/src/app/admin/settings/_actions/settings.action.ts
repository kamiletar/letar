'use server'

/**
 * Server actions для настроек Telegram-бота
 */

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { sendTestMessage } from '@/lib/telegram'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

/**
 * Базовый URL Telegram Bot API.
 * api.telegram.org нестабилен с РФ-хостинга — проксируем через `tg-proxy.letar.best` (mail сервер).
 * Тот же подход используется в `apps/kami` и в `getTelegramBot()` через `client.apiRoot`.
 */
const TELEGRAM_API = process.env.TELEGRAM_API_ROOT ?? 'https://api.telegram.org'

const TelegramConfigSchema = z
  .object({
    botToken: z.string().max(200).optional(),
    enabled: z.boolean(),
    autoAnnouncement: z.boolean().optional(),
    autoHalfTime: z.boolean().optional(),
    autoResult: z.boolean().optional(),
  })
  .strip()

/** Получить текущие настройки Telegram */
export const getTelegramConfigAction = adminGuard(async () => {
  const config = await prisma.telegramConfig.findUnique({ where: { id: 'default' } })
  return {
    data: config
      ? {
        // Маскируем токен — показываем только последние 8 символов
        botToken: config.botToken
          ? `${'*'.repeat(Math.max(0, config.botToken.length - 8))}${config.botToken.slice(-8)}`
          : '',
        botTokenSet: !!config.botToken,
        enabled: config.enabled,
        autoAnnouncement: config.autoAnnouncement,
        autoHalfTime: config.autoHalfTime,
        autoResult: config.autoResult,
      }
      : {
        botToken: '',
        botTokenSet: false,
        enabled: false,
        autoAnnouncement: false,
        autoHalfTime: false,
        autoResult: false,
      },
  }
})

/** Сохранить настройки Telegram */
export const saveTelegramConfigAction = adminGuard(async (input: unknown) => {
  const parsed = TelegramConfigSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: 'Некорректные данные' }
  }

  const { botToken, enabled, autoAnnouncement, autoHalfTime, autoResult } = parsed.data

  // Если токен не изменён (маскированный), не перезаписываем
  const data: Record<string, unknown> = {
    enabled,
    autoAnnouncement: autoAnnouncement ?? false,
    autoHalfTime: autoHalfTime ?? false,
    autoResult: autoResult ?? false,
  }
  if (botToken && !botToken.startsWith('*')) {
    data.botToken = botToken
  }

  await prisma.telegramConfig.upsert({
    where: { id: 'default' },
    create: { id: 'default', ...data },
    update: data,
  })

  revalidatePath('/admin/settings')
  return { success: true as const }
})

/** Отправить тестовое сообщение */
export const testTelegramAction = adminGuard(async (chatId: string) => {
  if (!chatId.trim()) {
    return { success: false as const, error: 'Укажите Chat ID' }
  }

  const result = await sendTestMessage(chatId.trim())
  if (!result.success) {
    return { success: false as const, error: result.error ?? 'Неизвестная ошибка' }
  }

  return { success: true as const }
})

/** Установить webhook для Telegram бота (автонастройка) */
export const setupTelegramWebhookAction = adminGuard(async () => {
  const config = await prisma.telegramConfig.findUnique({ where: { id: 'default' } })
  if (!config?.botToken) {
    return { success: false as const, error: 'Токен бота не настроен' }
  }

  // Webhook URL: по умолчанию прямой, но если задан TELEGRAM_WEBHOOK_URL —
  // используем его. На проде (s2) провайдер ДЦ режет входящие соединения от IP
  // диапазонов Telegram Cloud, поэтому направляем Telegram на reverse-proxy
  // `tg-in.letar.best` (mail сервер), который переправит запрос обратно к нам.
  // См. CHANGELOG v3.27.0 и infra nginx custom http.conf.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://grandslamcup.letar.best'
  const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL ?? `${siteUrl}/api/telegram/webhook`
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET

  try {
    // Устанавливаем webhook через Telegram Bot API
    const params = new URLSearchParams({
      url: webhookUrl,
      allowed_updates: JSON.stringify(['message', 'message_reaction_count']),
    })
    if (secretToken) {
      params.set('secret_token', secretToken)
    }

    const response = await fetch(`${TELEGRAM_API}/bot${config.botToken}/setWebhook?${params.toString()}`)
    const result = (await response.json()) as { ok: boolean; description?: string; result?: boolean }

    if (!result.ok) {
      return { success: false as const, error: `Telegram API: ${result.description ?? 'неизвестная ошибка'}` }
    }

    return { success: true as const, url: webhookUrl }
  } catch (err) {
    return {
      success: false as const,
      error: `Ошибка сети: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
})

/** Удалить webhook (откатить на polling) */
export const deleteTelegramWebhookAction = adminGuard(async () => {
  const config = await prisma.telegramConfig.findUnique({ where: { id: 'default' } })
  if (!config?.botToken) {
    return { success: false as const, error: 'Токен бота не настроен' }
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${config.botToken}/deleteWebhook`)
    const result = (await response.json()) as { ok: boolean; description?: string }

    if (!result.ok) {
      return { success: false as const, error: `Telegram API: ${result.description ?? 'неизвестная ошибка'}` }
    }

    return { success: true as const }
  } catch (err) {
    return {
      success: false as const,
      error: `Ошибка сети: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
})

/** Получить текущую информацию о webhook (для проверки) */
export const getWebhookInfoAction = adminGuard(async () => {
  const config = await prisma.telegramConfig.findUnique({ where: { id: 'default' } })
  if (!config?.botToken) {
    return { success: false as const, error: 'Токен бота не настроен' }
  }

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${config.botToken}/getWebhookInfo`)
    const result = (await response.json()) as {
      ok: boolean
      description?: string
      result?: {
        url: string
        has_custom_certificate: boolean
        pending_update_count: number
        last_error_date?: number
        last_error_message?: string
        max_connections?: number
        allowed_updates?: string[]
      }
    }

    if (!result.ok || !result.result) {
      return { success: false as const, error: result.description ?? 'Не удалось получить информацию' }
    }

    return {
      success: true as const,
      info: {
        url: result.result.url,
        pendingUpdates: result.result.pending_update_count,
        lastError: result.result.last_error_message ?? null,
        lastErrorDate: result.result.last_error_date
          ? new Date(result.result.last_error_date * 1000).toISOString()
          : null,
        allowedUpdates: result.result.allowed_updates ?? [],
      },
    }
  } catch (err) {
    return {
      success: false as const,
      error: `Ошибка сети: ${err instanceof Error ? err.message : String(err)}`,
    }
  }
})

/** Получить список городов с chatId для тестирования */
export const getCitiesWithChatIdAction = adminGuard(async () => {
  const cities = await prisma.city.findMany({
    select: { id: true, name: true, telegramChatId: true },
    orderBy: { name: 'asc' },
  })

  return { data: cities }
})
