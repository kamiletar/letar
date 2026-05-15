/**
 * KPI карточка с трендами и sparkline графиком
 *
 * Отображает ключевые показатели с:
 * - Текущим значением
 * - Процентом изменения (тренд)
 * - Мини-графиком (sparkline) за период
 *
 * @module kpi-card
 */

'use client'

import { Box, Card, HStack, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'
import { LuArrowDown, LuArrowUp, LuMinus } from 'react-icons/lu'

// === Типы ===

export interface KPICardProps {
  /** Название показателя */
  title: string
  /** Текущее значение */
  value: number | string
  /** Процент изменения (положительный = рост, отрицательный = падение) */
  trend?: number
  /** Данные для sparkline (массив чисел) */
  sparklineData?: number[]
  /** Цветовая схема */
  colorPalette?: string
  /** Иконка */
  icon?: React.ReactNode
  /** Форматтер для значения */
  formatValue?: (value: number | string) => string
  /** Единица измерения */
  unit?: string
  /** Период для подписи (напр. "за неделю") */
  periodLabel?: string
  /** Инвертировать цвет тренда (для негативных метрик, где рост = плохо) */
  invertTrend?: boolean
}

// === Sparkline компонент ===

interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
}

function Sparkline({ data, width = 80, height = 24, color = '#3182ce', strokeWidth = 2 }: SparklineProps) {
  const pathData = useMemo(() => {
    if (data.length < 2) {
      return ''
    }

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    // Нормализуем данные в координаты SVG
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width
      const y = height - ((value - min) / range) * height
      return { x, y }
    })

    // Строим путь
    return points.map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`)).join(' ')
  }, [data, width, height])

  if (data.length < 2) {
    return null
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// === Trend indicator компонент ===

interface TrendIndicatorProps {
  trend: number
  invert?: boolean
}

function TrendIndicator({ trend, invert = false }: TrendIndicatorProps) {
  // Определяем направление и цвет
  const isPositive = trend > 0
  const isNeutral = trend === 0

  // Инвертируем цвета если нужно (для негативных метрик)
  let color: string
  let IconComponent: React.ElementType

  if (isNeutral) {
    color = 'fg.muted'
    IconComponent = LuMinus
  } else if (isPositive) {
    color = invert ? 'red.500' : 'green.500'
    IconComponent = LuArrowUp
  } else {
    color = invert ? 'green.500' : 'red.500'
    IconComponent = LuArrowDown
  }

  const formattedTrend = isPositive ? `+${trend.toFixed(1)}%` : `${trend.toFixed(1)}%`

  return (
    <HStack gap={1} color={color}>
      <Icon boxSize={3}>
        <IconComponent />
      </Icon>
      <Text fontSize="xs" fontWeight="medium">
        {formattedTrend}
      </Text>
    </HStack>
  )
}

// === Основной компонент ===

export function KPICard({
  title,
  value,
  trend,
  sparklineData,
  colorPalette = 'blue',
  icon,
  formatValue,
  unit,
  periodLabel,
  invertTrend = false,
}: KPICardProps) {
  // Определяем цвет для sparkline на основе тренда
  const sparklineColor = useMemo(() => {
    if (trend === undefined) {
      return '#3182ce'
    } // blue
    if (trend > 0) {
      return invertTrend ? '#E53E3E' : '#38A169'
    } // red или green
    if (trend < 0) {
      return invertTrend ? '#38A169' : '#E53E3E'
    }
    return '#A0AEC0' // gray
  }, [trend, invertTrend])

  // Форматируем значение
  const displayValue = formatValue ? formatValue(value) : value

  return (
    <Card.Root>
      <Card.Body p={4}>
        <VStack gap={3} align="stretch">
          {/* Заголовок и иконка */}
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted" fontWeight="medium">
              {title}
            </Text>
            {icon && <Box color={`${colorPalette}.500`}>{icon}</Box>}
          </HStack>

          {/* Значение и тренд */}
          <HStack justify="space-between" align="flex-end">
            <VStack gap={0} align="flex-start">
              <HStack gap={1} align="baseline">
                <Text fontSize="2xl" fontWeight="bold" lineHeight={1}>
                  {displayValue}
                </Text>
                {unit && (
                  <Text fontSize="sm" color="fg.muted">
                    {unit}
                  </Text>
                )}
              </HStack>
              {periodLabel && (
                <Text fontSize="xs" color="fg.subtle">
                  {periodLabel}
                </Text>
              )}
            </VStack>

            {/* Sparkline */}
            {sparklineData && sparklineData.length >= 2 && (
              <Box opacity={0.8}>
                <Sparkline data={sparklineData} color={sparklineColor} />
              </Box>
            )}
          </HStack>

          {/* Тренд индикатор */}
          {trend !== undefined && (
            <HStack justify="flex-start">
              <TrendIndicator trend={trend} invert={invertTrend} />
              <Text fontSize="xs" color="fg.muted">
                по сравнению с прошлым периодом
              </Text>
            </HStack>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

// === Сетка KPI карточек ===

export interface KPIGridProps {
  children: React.ReactNode
  columns?: { base?: number; md?: number; lg?: number }
}

export function KPIGrid({ children, columns = { base: 1, md: 2, lg: 4 } }: KPIGridProps) {
  return (
    <SimpleGrid columns={columns} gap={4}>
      {children}
    </SimpleGrid>
  )
}

// === Хелперы для расчёта трендов ===

/**
 * Вычисляет процентное изменение между двумя периодами
 */
export function calculateTrend(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  return ((current - previous) / previous) * 100
}

/**
 * Генерирует sparkline данные из массива значений по дням
 */
export function generateSparklineData(dailyValues: number[], days = 7): number[] {
  // Берём последние N дней
  return dailyValues.slice(-days)
}

// === Форматтеры ===

export function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('ru-RU').format(num)
}

export function formatPercent(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return `${num.toFixed(1)}%`
}
