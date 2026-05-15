'use client'

import { OrderStatus } from '@/generated/prisma'
import { Badge } from '@chakra-ui/react'

interface OrderStatusBadgeProps {
  status: OrderStatus
}

/**
 * Бейдж для отображения статуса заказа с цветовой индикацией.
 */
export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const config = getStatusConfig(status)

  return (
    <Badge colorPalette={config.colorPalette} size="lg">
      {config.label}
    </Badge>
  )
}

/**
 * Возвращает конфигурацию отображения для статуса заказа.
 */
function getStatusConfig(status: OrderStatus): {
  label: string
  colorPalette: string
} {
  switch (status) {
    case OrderStatus.NEW:
      return {
        label: 'Новый',
        colorPalette: 'blue',
      }
    case OrderStatus.PREORDER:
      return {
        label: 'Предзаказ',
        colorPalette: 'purple',
      }
    case OrderStatus.CONFIRMED:
      return {
        label: 'Подтвержден',
        colorPalette: 'green',
      }
    case OrderStatus.PROCESSING:
      return {
        label: 'В обработке',
        colorPalette: 'yellow',
      }
    case OrderStatus.SHIPPED:
      return {
        label: 'Отправлен',
        colorPalette: 'orange',
      }
    case OrderStatus.DELIVERED:
      return {
        label: 'Доставлен',
        colorPalette: 'green',
      }
    case OrderStatus.CANCELLED:
      return {
        label: 'Отменен',
        colorPalette: 'red',
      }
    default:
      return {
        label: 'Неизвестно',
        colorPalette: 'gray',
      }
  }
}
