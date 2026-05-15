'use client'

import { Badge, Box, Card, Heading, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export interface MetricCardProps {
  /**
   * Название метрики
   */
  title: string

  /**
   * Числовое значение метрики
   */
  value: number | string

  /**
   * Описание или подзаголовок метрики (опционально)
   */
  description?: string

  /**
   * Иконка метрики (опционально)
   */
  icon?: ReactNode

  /**
   * Цвет акцента карточки
   */
  colorScheme?: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'gray' | 'fg'

  /**
   * Изменение относительно предыдущего периода (опционально)
   */
  trend?: {
    value: number
    isPositive: boolean
  }

  /**
   * Дополнительные действия (например, ссылка "Подробнее")
   */
  actions?: ReactNode
}

/**
 * Карточка метрики для дашборда аналитики
 */
export function MetricCard({ title, value, description, icon, colorScheme = 'blue', trend, actions }: MetricCardProps) {
  return (
    <Card.Root
      borderTop="4px solid"
      borderTopColor={`${colorScheme}.500`}
      transition="all 0.3s ease"
      _hover={{
        transform: 'translateY(-2px)',
        shadow: 'lg',
      }}
    >
      <Card.Body>
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Заголовок с иконкой */}
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={2}>
              {icon && (
                <Box color={`${colorScheme}.500`} fontSize="xl">
                  {icon}
                </Box>
              )}
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                {title}
              </Text>
            </Box>
            {actions}
          </Box>

          {/* Значение метрики */}
          <Heading size="2xl" color={`${colorScheme}.600`}>
            {value}
          </Heading>

          {/* Описание и тренд */}
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
            {description && (
              <Text fontSize="xs" color="gray.500">
                {description}
              </Text>
            )}

            {trend && (
              <Badge colorPalette={trend.isPositive ? 'green' : 'red'} variant="subtle" size="sm">
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </Badge>
            )}
          </Box>
        </Box>
      </Card.Body>
    </Card.Root>
  )
}
