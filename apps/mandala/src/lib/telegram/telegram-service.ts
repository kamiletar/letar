/**
 * Бизнес-логика Telegram уведомлений
 * Получает настройки из БД и отправляет сообщения
 */

import type { ContactMessage } from '@/generated/prisma'
import { prisma } from '@/lib/db'
import { TelegramClient, TelegramClientError } from './telegram-client'
import {
  formatContactMessageNotification,
  formatOrderNotification,
  formatTestNotification,
  type OrderWithItems,
} from './telegram-formatter'

/**
 * Результат отправки уведомления
 */
export type NotifyResult = { success: true; messageId: number } | { success: false; error: string; skipped?: boolean }

/**
 * Кэш для TelegramClient — переиспользуем клиент вместо создания нового при каждом уведомлении
 */
let cachedConfig: {
  client: TelegramClient
  chatId: string
  expiresAt: number
} | null = null

const CACHE_TTL = 5 * 60 * 1000 // 5 минут

/**
 * Получить настройки Telegram из БД
 */
async function getTelegramSettings() {
  const settings = await prisma.appSettings.findUnique({
    where: { id: 'default' },
    select: {
      telegramEnabled: true,
      telegramBotToken: true,
      telegramChatId: true,
    },
  })
  return settings
}

/**
 * Создать клиент Telegram если настройки валидны (с кэшированием)
 */
async function createClientIfEnabled(): Promise<{
  client: TelegramClient
  chatId: string
} | null> {
  // Проверяем кэш
  if (cachedConfig && Date.now() < cachedConfig.expiresAt) {
    return cachedConfig
  }

  const settings = await getTelegramSettings()

  if (!settings?.telegramEnabled) {
    cachedConfig = null
    return null
  }

  if (!settings.telegramBotToken || !settings.telegramChatId) {
    console.warn('[Telegram] Enabled but token/chatId not configured')
    cachedConfig = null
    return null
  }

  // Создаём и кэшируем клиент
  cachedConfig = {
    client: new TelegramClient(settings.telegramBotToken),
    chatId: settings.telegramChatId,
    expiresAt: Date.now() + CACHE_TTL,
  }

  return cachedConfig
}

/**
 * Отправить уведомление о новом заказе
 */
export async function notifyNewOrder(order: OrderWithItems): Promise<NotifyResult> {
  const config = await createClientIfEnabled()

  if (!config) {
    return { success: false, error: 'Telegram not configured', skipped: true }
  }

  try {
    const text = formatOrderNotification(order)
    const result = await config.client.sendMessage({
      chatId: config.chatId,
      text,
      parseMode: 'HTML',
    })

    console.warn(`[Telegram] Order notification sent: ${order.id}`)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    const errorMsg = error instanceof TelegramClientError ? (error.description ?? error.message) : 'Unknown error'

    console.error(`[Telegram] Failed to send order notification:`, errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * Отправить уведомление о новом контактном сообщении
 */
export async function notifyNewContactMessage(contact: ContactMessage): Promise<NotifyResult> {
  const config = await createClientIfEnabled()

  if (!config) {
    return { success: false, error: 'Telegram not configured', skipped: true }
  }

  try {
    const text = formatContactMessageNotification(contact)
    const result = await config.client.sendMessage({
      chatId: config.chatId,
      text,
      parseMode: 'HTML',
    })

    console.warn(`[Telegram] Contact message notification sent: ${contact.id}`)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    const errorMsg = error instanceof TelegramClientError ? (error.description ?? error.message) : 'Unknown error'

    console.error(`[Telegram] Failed to send contact notification:`, errorMsg)
    return { success: false, error: errorMsg }
  }
}

/**
 * Отправить тестовое уведомление (для проверки настроек)
 */
export async function sendTestNotification(botToken: string, chatId: string): Promise<NotifyResult> {
  try {
    const client = new TelegramClient(botToken)
    const text = formatTestNotification()
    const result = await client.sendMessage({
      chatId,
      text,
      parseMode: 'HTML',
    })

    return { success: true, messageId: result.messageId }
  } catch (error) {
    const errorMsg = error instanceof TelegramClientError ? (error.description ?? error.message) : 'Unknown error'

    return { success: false, error: errorMsg }
  }
}
