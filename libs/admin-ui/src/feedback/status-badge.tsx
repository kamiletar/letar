import { Badge } from '@chakra-ui/react'
import type { StatusType } from '../types'

interface StatusBadgeProps {
  /** Тип статуса */
  type: StatusType
  /** Значение статуса */
  value: boolean | string
}

/** Конфигурация статусов */
const statusConfig: Record<
  StatusType,
  {
    true: { color: string; label: string }
    false: { color: string; label: string }
    [key: string]: { color: string; label: string }
  }
> = {
  published: {
    true: { color: 'green', label: 'Опубликовано' },
    false: { color: 'gray', label: 'Скрыто' },
  },
  inStock: {
    true: { color: 'blue', label: 'В наличии' },
    false: { color: 'red', label: 'Нет в наличии' },
  },
  order: {
    PENDING: { color: 'yellow', label: 'Ожидает' },
    CONFIRMED: { color: 'blue', label: 'Подтверждён' },
    SHIPPED: { color: 'purple', label: 'Отправлен' },
    DELIVERED: { color: 'green', label: 'Доставлен' },
    CANCELLED: { color: 'red', label: 'Отменён' },
    true: { color: 'gray', label: 'Неизвестно' },
    false: { color: 'gray', label: 'Неизвестно' },
  },
}

/**
 * Унифицированный компонент для отображения статусов
 *
 * @example
 * ```tsx
 * <StatusBadge type="published" value={true} />
 * <StatusBadge type="inStock" value={false} />
 * <StatusBadge type="order" value="PENDING" />
 * ```
 */
export function StatusBadge({ type, value }: StatusBadgeProps) {
  const key = typeof value === 'boolean' ? String(value) : value
  const config = statusConfig[type][key] || statusConfig[type]['false']

  return <Badge colorPalette={config.color}>{config.label}</Badge>
}

/**
 * Создать кастомный StatusBadge с дополнительными конфигурациями
 */
export function createStatusBadge<T extends string>(
  customConfig: Record<T, Record<string, { color: string; label: string }>>,
) {
  return function CustomStatusBadge({ type, value }: { type: T; value: boolean | string }) {
    const key = typeof value === 'boolean' ? String(value) : value
    const typeConfig = customConfig[type]
    const config = typeConfig?.[key] || { color: 'gray', label: 'Неизвестно' }

    return <Badge colorPalette={config.color}>{config.label}</Badge>
  }
}
