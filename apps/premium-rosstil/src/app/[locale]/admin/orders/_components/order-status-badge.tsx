import { OrderStatusLabels } from '@/generated/form-schemas'
import type { OrderStatus } from '@/generated/prisma'
import { Badge } from '@chakra-ui/react'

// Реэкспорт для совместимости
export const STATUS_LABELS = OrderStatusLabels

// Colors for status badges
const STATUS_COLORS: Record<OrderStatus, 'blue' | 'cyan' | 'yellow' | 'purple' | 'green' | 'red'> = {
  NEW: 'blue',
  PREORDER: 'purple',
  CONFIRMED: 'cyan',
  PROCESSING: 'yellow',
  SHIPPED: 'purple',
  DELIVERED: 'green',
  CANCELLED: 'red',
}

interface OrderStatusBadgeProps {
  status: OrderStatus
}

/**
 * Badge component for displaying order status with appropriate color
 */
export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <Badge colorPalette={STATUS_COLORS[status]} variant="solid" size="sm">
      {STATUS_LABELS[status]}
    </Badge>
  )
}
