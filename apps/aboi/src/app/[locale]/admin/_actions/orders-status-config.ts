/**
 * Конфигурация переходов статусов заказа.
 * Не помечено `'use server'` — это plain module, можно импортировать в server и client.
 */
export const ALL_ORDER_STATUSES = [
  'PLACED',
  'CONFIRMED',
  'PAID',
  'PRINTING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const

export type OrderStatusKey = typeof ALL_ORDER_STATUSES[number]

export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatusKey, OrderStatusKey[]> = {
  PLACED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PAID', 'CANCELLED'],
  PAID: ['PRINTING', 'REFUNDED'],
  PRINTING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
}
