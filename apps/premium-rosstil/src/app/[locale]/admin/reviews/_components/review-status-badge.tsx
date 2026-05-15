import { Badge } from '@chakra-ui/react'

/** Статусы отзывов с русскими названиями */
export const REVIEW_STATUS_LABELS: Record<string, string> = {
  PUBLISHED: 'Опубликован',
  HIDDEN: 'Скрыт',
  DELETED: 'Удалён',
}

/** Цвета для статусов */
const STATUS_COLORS: Record<string, string> = {
  PUBLISHED: 'green',
  HIDDEN: 'yellow',
  DELETED: 'red',
}

interface ReviewStatusBadgeProps {
  status: string
}

/** Бейдж статуса отзыва */
export function ReviewStatusBadge({ status }: ReviewStatusBadgeProps) {
  return (
    <Badge colorPalette={STATUS_COLORS[status] || 'gray'} variant="solid" size="sm">
      {REVIEW_STATUS_LABELS[status] || status}
    </Badge>
  )
}
