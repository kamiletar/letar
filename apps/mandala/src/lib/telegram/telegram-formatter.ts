/**
 * Форматирование сообщений для Telegram
 */

import type { ContactMessage, Order, OrderItem, Product } from '@/generated/prisma'

/**
 * Экранирование HTML-сущностей
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Форматирование цены
 */
function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

/**
 * Форматирование даты
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

/**
 * Тип заказа с товарами для форматирования
 */
export interface OrderWithItems extends Order {
  items: Array<OrderItem & { product: Pick<Product, 'name'> }>
}

/**
 * Форматирование уведомления о новом заказе
 */
export function formatOrderNotification(order: OrderWithItems): string {
  let message = `🛒 <b>Новый заказ</b>\n\n`
  message += `<b>ID:</b> <code>${escapeHtml(order.id.slice(0, 8))}...</code>\n`
  message += `<b>Дата:</b> ${formatDate(order.createdAt)}\n\n`

  // Товары
  message += `<b>📦 Товары</b>\n`
  for (const item of order.items) {
    message += `• ${escapeHtml(item.product.name)}: ${item.quantity} шт. × ${formatPrice(item.price)}\n`
  }
  message += `\n<b>Итого:</b> ${formatPrice(order.total)}\n`

  // Клиент
  message += `\n<b>👤 Клиент</b>\n`
  message += `• ${escapeHtml(order.name)}\n`
  message += `• <a href="tel:${escapeHtml(order.phone)}">${escapeHtml(order.phone)}</a>\n`
  if (order.email) {
    message += `• ${escapeHtml(order.email)}\n`
  }

  // Адрес
  if (order.address) {
    message += `\n<b>🚚 Адрес</b>\n${escapeHtml(order.address)}\n`
  }

  // Комментарий
  if (order.comment) {
    message += `\n<b>💬 Комментарий</b>\n${escapeHtml(order.comment)}\n`
  }

  return message
}

/**
 * Форматирование уведомления о новом контактном сообщении
 */
export function formatContactMessageNotification(contact: ContactMessage): string {
  let message = `📩 <b>Новое сообщение</b>\n\n`
  message += `<b>Дата:</b> ${formatDate(contact.createdAt)}\n\n`

  // Отправитель
  message += `<b>👤 Отправитель</b>\n`
  message += `• ${escapeHtml(contact.name)}\n`
  message += `• ${escapeHtml(contact.email)}\n\n`

  // Сообщение (ограничиваем длину)
  const maxLength = 500
  let msgText = contact.message
  if (msgText.length > maxLength) {
    msgText = msgText.slice(0, maxLength) + '...'
  }
  message += `<b>💬 Сообщение</b>\n${escapeHtml(msgText)}`

  return message
}

/**
 * Форматирование тестового сообщения
 */
export function formatTestNotification(): string {
  return `🔔 <b>Тестовое уведомление</b>

Если вы видите это сообщение, Telegram уведомления настроены корректно.

<i>Elfafeya Art — Mandala</i>`
}
