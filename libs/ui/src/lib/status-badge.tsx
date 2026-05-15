'use client'

import { Badge, type BadgeProps, Icon } from '@chakra-ui/react'
import type { ComponentType, ReactNode } from 'react'

type ColorPalette = 'green' | 'red' | 'blue' | 'yellow' | 'orange' | 'purple' | 'gray' | 'brand'

/** Конфигурация для одного значения статуса */
export interface StatusConfig {
  label: string
  colorPalette: ColorPalette
  icon?: ComponentType
}

interface StatusBadgeProps<T extends string> extends Omit<BadgeProps, 'colorPalette' | 'children'> {
  /** Значение статуса */
  status: T
  /** Карта конфигураций статусов */
  config: Record<T, StatusConfig>
  /** Показывать иконку (если есть в конфиге) */
  showIcon?: boolean
  /** Кастомный контент вместо label */
  children?: ReactNode
}

/**
 * Универсальный компонент для отображения статуса с конфигурируемыми цветами и лейблами
 *
 * @example
 * ```tsx
 * const ORDER_STATUS_CONFIG: Record<OrderStatus, StatusConfig> = {
 *   PENDING: { label: 'Ожидает', colorPalette: 'yellow' },
 *   CONFIRMED: { label: 'Подтверждён', colorPalette: 'blue' },
 *   COMPLETED: { label: 'Завершён', colorPalette: 'green' },
 *   CANCELLED: { label: 'Отменён', colorPalette: 'red' },
 * }
 *
 * <StatusBadge status={order.status} config={ORDER_STATUS_CONFIG} />
 * ```
 */
export function StatusBadge<T extends string>({
  status,
  config,
  showIcon = true,
  children,
  ...badgeProps
}: StatusBadgeProps<T>) {
  const statusConfig = config[status]

  if (!statusConfig) {
    return (
      <Badge colorPalette="gray" {...badgeProps}>
        {children ?? status}
      </Badge>
    )
  }

  const { label, colorPalette, icon: IconComponent } = statusConfig

  return (
    <Badge colorPalette={colorPalette} {...badgeProps}>
      {showIcon && IconComponent && (
        <Icon boxSize={3} mr={1}>
          <IconComponent />
        </Icon>
      )}
      {children ?? label}
    </Badge>
  )
}
