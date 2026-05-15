import { Badge } from '@chakra-ui/react'

/** Статусы возвратов с русскими названиями */
export const RETURN_STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Запрошен',
  APPROVED: 'Одобрен',
  REJECTED: 'Отклонён',
  SHIPPED_BACK: 'Отправлен назад',
  RECEIVED: 'Получен',
  REFUNDED: 'Возвращён',
}

/** Цвета для статусов */
const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'yellow',
  APPROVED: 'blue',
  REJECTED: 'red',
  SHIPPED_BACK: 'purple',
  RECEIVED: 'cyan',
  REFUNDED: 'green',
}

interface ReturnStatusBadgeProps {
  status: string
}

/** Бейдж статуса возврата */
export function ReturnStatusBadge({ status }: ReturnStatusBadgeProps) {
  return (
    <Badge colorPalette={STATUS_COLORS[status] || 'gray'} variant="solid" size="sm">
      {RETURN_STATUS_LABELS[status] || status}
    </Badge>
  )
}
