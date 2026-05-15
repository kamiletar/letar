/**
 * Telegram уведомления для Mandala
 *
 * @example
 * import { notifyNewOrder, notifyNewContactMessage } from '@/lib/telegram'
 *
 * // Fire-and-forget уведомление о заказе
 * notifyNewOrder(order).catch(console.error)
 */

export { TelegramClient, TelegramClientError } from './telegram-client'
export type { SendMessageParams } from './telegram-client'

export { notifyNewContactMessage, notifyNewOrder, sendTestNotification } from './telegram-service'
export type { NotifyResult } from './telegram-service'

export { formatContactMessageNotification, formatOrderNotification, formatTestNotification } from './telegram-formatter'
export type { OrderWithItems } from './telegram-formatter'
