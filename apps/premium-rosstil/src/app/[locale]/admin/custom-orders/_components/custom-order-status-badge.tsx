import { CustomOrderStatusLabels, CustomOrderTypeLabels } from '@/generated/form-schemas'
import type { CustomOrderStatus, CustomOrderType } from '@/generated/prisma'
import { Badge } from '@chakra-ui/react'

// Реэкспорт для совместимости
export const TYPE_LABELS = CustomOrderTypeLabels
export const STATUS_LABELS = CustomOrderStatusLabels

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
