import { logger } from './logger'
import type { CustomOrderEmailData, OrderEmailData } from './order-emails'

const TELEGRAM_BOT_TOKEN = process.env.AUTH_TELEGRAM_BOT_TOKEN
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID

interface SendTelegramMessageOptions {
  chatId: string
  text: string
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2'
}

/**
 * Send a message via Telegram Bot API
 */
async function sendTelegramMessage({ chatId, text, parseMode = 'HTML' }: SendTelegramMessageOptions) {
  if (!TELEGRAM_BOT_TOKEN) {
    logger.warn('[Telegram] AUTH_TELEGRAM_BOT_TOKEN not set, skipping notification')
    return { success: false, error: 'AUTH_TELEGRAM_BOT_TOKEN not configured' }
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    })

    const result = await response.json()

    if (!response.ok || !result.ok) {
      logger.error('[Telegram] Failed to send message:', result)
      return { success: false, error: result.description || 'Unknown error' }
    }

    logger.info('[Telegram] Message sent successfully:', result.result.message_id)
    return { success: true, messageId: result.result.message_id }
  } catch (error) {
    logger.error('[Telegram] Error sending message:', error)
    return { success: false, error }
  }
}

function getOrderTypeLabel(type: CustomOrderEmailData['orderType']): string {
  const labels: Record<CustomOrderEmailData['orderType'], string> = {
    MADE_TO_ORDER: 'На заказ',
    CUSTOM_DESIGN: 'Индивидуальный заказ',
    B2B_PARTNERSHIP: 'Сотрудничество (B2B)',
  }
  return labels[type]
}

function getOrderTypeEmoji(type: CustomOrderEmailData['orderType']): string {
  const emojis: Record<CustomOrderEmailData['orderType'], string> = {
    MADE_TO_ORDER: '🛍️',
    CUSTOM_DESIGN: '✂️',
    B2B_PARTNERSHIP: '🏭',
  }
  return emojis[type]
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Format custom order notification for Telegram
 */
function formatCustomOrderNotification(data: CustomOrderEmailData): string {
  const emoji = getOrderTypeEmoji(data.orderType)
  const typeLabel = getOrderTypeLabel(data.orderType)

  let message = `${emoji} <b>Новый заказ №${escapeHtml(data.orderNumber)}</b>\n\n`
  message += `<b>Тип:</b> ${escapeHtml(typeLabel)}\n`
  message += `<b>Дата:</b> ${formatDate(data.createdAt)}\n\n`

  // Product info (only for orders with product)
  if (data.productName) {
    message += `<b>📦 Товар</b>\n`
    message += `• ${escapeHtml(data.productName)}\n`
    if (data.variantName) {
      message += `• Цвет: ${escapeHtml(data.variantName)}\n`
    }
  }

  // Order type specific details
  if (data.orderType === 'MADE_TO_ORDER') {
    // На заказ: размер + мерки + детали кастомизации
    if (data.sizeName) {
      message += `• Размер: ${escapeHtml(data.sizeName)}\n`
    }
    message += `\n<b>📐 Мерки</b>\n`
    if (data.customBust) {
      message += `• Грудь: ${data.customBust} см\n`
    }
    if (data.customWaist) {
      message += `• Талия: ${data.customWaist} см\n`
    }
    if (data.customHips) {
      message += `• Бёдра: ${data.customHips} см\n`
    }
    if (data.customHeight) {
      message += `• Рост: ${data.customHeight} см\n`
    }
    if (data.customDetails) {
      message += `\n<b>✨ Детали кастомизации</b>\n${escapeHtml(data.customDetails)}\n`
    }
  } else if (data.orderType === 'CUSTOM_DESIGN') {
    // Индивидуальный заказ: мерки + описание + фото
    message += `<b>📐 Мерки</b>\n`
    if (data.customBust) {
      message += `• Грудь: ${data.customBust} см\n`
    }
    if (data.customWaist) {
      message += `• Талия: ${data.customWaist} см\n`
    }
    if (data.customHips) {
      message += `• Бёдра: ${data.customHips} см\n`
    }
    if (data.customHeight) {
      message += `• Рост: ${data.customHeight} см\n`
    }
    if (data.designDescription) {
      message += `\n<b>✂️ Описание дизайна</b>\n${escapeHtml(data.designDescription)}\n`
    }
    if (data.referenceImages?.length) {
      message += `\n<b>📷 Фото-ориентиры:</b> ${data.referenceImages.length} фото\n`
    }
  } else if (data.orderType === 'B2B_PARTNERSHIP') {
    // Сотрудничество B2B: компания + размерная сетка + цвет
    message += `\n<b>🏢 Компания</b>\n`
    if (data.companyName) {
      message += `• ${escapeHtml(data.companyName)}\n`
    }
    if (data.companyINN) {
      message += `• ИНН: ${escapeHtml(data.companyINN)}\n`
    }
    if (data.companyAddress) {
      message += `• ${escapeHtml(data.companyAddress)}\n`
    }
    if (data.preferredColor) {
      message += `• Цвет: ${escapeHtml(data.preferredColor)}\n`
    }
    if (data.wholesaleItems?.length) {
      message += `\n<b>📋 Позиции</b>\n`
      for (const item of data.wholesaleItems) {
        message += `• ${escapeHtml(item.sizeName)}: ${item.quantity} шт.\n`
      }
    }
    if (data.quantity) {
      message += `\n<b>Всего:</b> ${data.quantity} шт.\n`
    }
  }

  // Customer info
  message += `\n<b>👤 Клиент</b>\n`
  message += `• ${escapeHtml(data.customerName)}\n`
  message += `• <a href="tel:${escapeHtml(data.customerPhone)}">${escapeHtml(data.customerPhone)}</a>\n`
  if (data.customerEmail) {
    message += `• ${escapeHtml(data.customerEmail)}\n`
  }

  // Notes
  if (data.notes) {
    message += `\n<b>💬 Комментарий</b>\n${escapeHtml(data.notes)}\n`
  }

  return message
}

/**
 * Send notification about new custom order to admin via Telegram
 */
export async function sendCustomOrderTelegramNotification(data: CustomOrderEmailData) {
  if (!TELEGRAM_ADMIN_CHAT_ID) {
    logger.warn('[Telegram] TELEGRAM_ADMIN_CHAT_ID not set, skipping custom order notification')
    return { success: false, error: 'TELEGRAM_ADMIN_CHAT_ID not configured' }
  }

  const text = formatCustomOrderNotification(data)

  const result = await sendTelegramMessage({
    chatId: TELEGRAM_ADMIN_CHAT_ID,
    text,
    parseMode: 'HTML',
  })

  if (result.success) {
    logger.info(`[Telegram] Custom order notification sent for order ${data.orderNumber}`)
  } else {
    logger.error(`[Telegram] Failed to send custom order notification for order ${data.orderNumber}:`, result.error)
  }

  return result
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Format regular order notification for Telegram
 */
function formatOrderNotification(data: OrderEmailData): string {
  let message = `🛒 <b>Новый заказ №${escapeHtml(data.orderNumber)}</b>\n\n`
  message += `<b>Дата:</b> ${formatDate(data.createdAt)}\n\n`

  // Items
  message += `<b>📦 Товары</b>\n`
  for (const item of data.items) {
    message += `• ${escapeHtml(item.productName)}`
    if (item.variantColor) {
      message += ` (${escapeHtml(item.variantColor)})`
    }
    if (item.sizeName) {
      message += ` - ${escapeHtml(item.sizeName)}`
    }
    message += `: ${item.quantity} шт. × ${formatPrice(item.price)}\n`
  }

  message += `\n<b>Итого:</b> ${formatPrice(data.totalAmount)}\n`

  // Delivery
  message += `\n<b>🚚 Доставка</b>\n`
  message += `${escapeHtml(data.deliveryAddress)}\n`
  if (data.deliveryCity) {
    message += `${escapeHtml(data.deliveryCity)}`
    if (data.deliveryRegion) {
      message += `, ${escapeHtml(data.deliveryRegion)}`
    }
    message += '\n'
  }

  // Customer info
  message += `\n<b>👤 Покупатель</b>\n`
  message += `• ${escapeHtml(data.customerName)}\n`
  message += `• <a href="tel:${escapeHtml(data.customerPhone)}">${escapeHtml(data.customerPhone)}</a>\n`
  if (data.customerEmail) {
    message += `• ${escapeHtml(data.customerEmail)}\n`
  }

  // Notes
  if (data.notes) {
    message += `\n<b>📝 Комментарий</b>\n${escapeHtml(data.notes)}\n`
  }

  return message
}

/**
 * Send notification about new order (from cart checkout) to admin via Telegram
 */
// === Уведомления о низких остатках ===

export interface LowStockItem {
  productName: string
  variantColor: string
  sizeName: string
  availableCount: number
}

function formatLowStockNotification(items: LowStockItem[]): string {
  let message = `⚠️ <b>Низкие остатки товаров</b>\n\n`
  message += `Следующие позиции имеют остаток ниже порога:\n\n`

  for (const item of items) {
    message += `• <b>${escapeHtml(item.productName)}</b>`
    message += ` (${escapeHtml(item.variantColor)}, ${escapeHtml(item.sizeName)})`
    message += ` — <b>${item.availableCount} шт.</b>\n`
  }

  message += `\nРекомендуется пополнить запасы.`
  return message
}

/**
 * Отправить уведомление админу о низких остатках товаров через Telegram
 */
export async function sendLowStockTelegramNotification(items: LowStockItem[]) {
  if (!TELEGRAM_ADMIN_CHAT_ID) {
    logger.warn('[Telegram] TELEGRAM_ADMIN_CHAT_ID not set, skipping low stock notification')
    return { success: false, error: 'TELEGRAM_ADMIN_CHAT_ID not configured' }
  }

  if (items.length === 0) {
    return { success: true }
  }

  const text = formatLowStockNotification(items)

  const result = await sendTelegramMessage({
    chatId: TELEGRAM_ADMIN_CHAT_ID,
    text,
    parseMode: 'HTML',
  })

  if (result.success) {
    logger.info(`[Telegram] Low stock notification sent for ${items.length} items`)
  } else {
    logger.error('[Telegram] Failed to send low stock notification:', result.error)
  }

  return result
}

export async function sendOrderTelegramNotification(data: OrderEmailData) {
  if (!TELEGRAM_ADMIN_CHAT_ID) {
    logger.warn('[Telegram] TELEGRAM_ADMIN_CHAT_ID not set, skipping order notification')
    return { success: false, error: 'TELEGRAM_ADMIN_CHAT_ID not configured' }
  }

  const text = formatOrderNotification(data)

  const result = await sendTelegramMessage({
    chatId: TELEGRAM_ADMIN_CHAT_ID,
    text,
    parseMode: 'HTML',
  })

  if (result.success) {
    logger.info(`[Telegram] Order notification sent for order ${data.orderNumber}`)
  } else {
    logger.error(`[Telegram] Failed to send order notification for order ${data.orderNumber}:`, result.error)
  }

  return result
}
