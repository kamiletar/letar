'use client'

import type { CustomOrderStatus, CustomOrderType } from '@/generated/prisma'
import { Badge } from '@chakra-ui/react'

// Labels for order types
export const TYPE_LABELS: Record<CustomOrderType, string> = {
  MADE_TO_ORDER: 'На заказ',
  CUSTOM_DESIGN: 'Индивидуальный дизайн',
  B2B_PARTNERSHIP: 'Сотрудничество B2B',
}

// Labels for order statuses
export const STATUS_LABELS: Record<CustomOrderStatus, string> = {
  NEW: 'Новый',
  CONFIRMED: 'Подтверждён',
  IN_PRODUCTION: 'В производстве',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отменён',
}

// Colors for status badges
const STATUS_COLORS: Record<CustomOrderStatus, 'blue' | 'cyan' | 'yellow' | 'green' | 'red'> = {
  NEW: 'blue',
  CONFIRMED: 'cyan',
  IN_PRODUCTION: 'yellow',
  COMPLETED: 'green',
  CANCELLED: 'red',
}

// Colors for type badges
const TYPE_COLORS: Record<CustomOrderType, 'purple' | 'teal' | 'orange'> = {
  MADE_TO_ORDER: 'purple',
  CUSTOM_DESIGN: 'teal',
  B2B_PARTNERSHIP: 'orange',
}

interface CustomOrderStatusBadgeProps {
  status: CustomOrderStatus
}

/**
 * Badge component for displaying custom order status with appropriate color
 */
export function CustomOrderStatusBadge({ status }: CustomOrderStatusBadgeProps) {
  return (
    <Badge colorPalette={STATUS_COLORS[status]} variant="solid" size="sm">
      {STATUS_LABELS[status]}
    </Badge>
  )
}

interface CustomOrderTypeBadgeProps {
  type: CustomOrderType
}

/**
 * Badge component for displaying custom order type with appropriate color
 */
export function CustomOrderTypeBadge({ type }: CustomOrderTypeBadgeProps) {
  return (
    <Badge colorPalette={TYPE_COLORS[type]} variant="subtle" size="sm">
      {TYPE_LABELS[type]}
    </Badge>
  )
}
