/**
 * Русские метки для всех ENUM'ов приложения Mandala
 */

import type { ImageCategory, OrderStatus, UserRole } from '@/generated/prisma'

// ===== UserRole =====
export const userRoleLabels: Record<UserRole, string> = {
  USER: 'Пользователь',
  ADMIN: 'Администратор',
}

// ===== ImageCategory =====
export const imageCategoryLabels: Record<ImageCategory, string> = {
  MANDALA: 'Мандала',
  PRODUCT: 'Товар',
  CONTENT: 'Контент',
  OTHER: 'Другое',
}

// ===== OrderStatus =====
export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: 'Ожидает оплаты',
  CONFIRMED: 'Подтверждён',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
}
