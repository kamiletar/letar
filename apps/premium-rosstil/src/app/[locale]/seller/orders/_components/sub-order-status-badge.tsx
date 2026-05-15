'use client'

import type { SubOrderStatus } from '@/generated/prisma'
import { Badge } from '@chakra-ui/react'

interface SubOrderStatusBadgeProps {
  status: SubOrderStatus
}

/**
 * Бейдж статуса подзаказа с цветовой индикацией.
 */
export function SubOrderStatusBadge({ status }: SubOrderStatusBadgeProps) {
  const config = getStatusConfig(status)

  return (
    <Badge colorPalette={config.colorPalette} size="sm">
      {config.label}
    </Badge>
  )
}

function getStatusConfig(status: SubOrderStatus): { label: string; colorPalette: string } {
  const map: Record<SubOrderStatus, { label: string; colorPalette: string }> = {
    PENDING_PAYMENT: { label: 'Ожидает оплаты', colorPalette: 'gray' },
    PAID: { label: 'Оплачен', colorPalette: 'blue' },
    PROCESSING: { label: 'В обработке', colorPalette: 'yellow' },
    SHIPPED: { label: 'Отправлен', colorPalette: 'purple' },
    DELIVERED: { label: 'Доставлен', colorPalette: 'green' },
    COMPLETED: { label: 'Завершён', colorPalette: 'green' },
    RETURN_REQUESTED: { label: 'Запрос возврата', colorPalette: 'orange' },
    RETURNED: { label: 'Возвращён', colorPalette: 'red' },
    CANCELLED: { label: 'Отменён', colorPalette: 'red' },
  }

  return map[status] ?? { label: 'Неизвестно', colorPalette: 'gray' }
}
