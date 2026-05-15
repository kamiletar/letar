'use client'

import { Box } from '@chakra-ui/react'
import { memo } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

/**
 * Точка данных для графика метрик
 */
export interface MetricDataPoint {
  /** Метка на оси X (время, дата, и т.д.) */
  time: string
  /** Значение метрики */
  value: number
  /** Опциональный timestamp для сортировки */
  timestamp?: number
}

interface MetricsChartProps {
  /** Данные для графика */
  data: MetricDataPoint[]
  /** Цвет линии и заливки (hex или Chakra токен) */
  color?: string
  /** Уникальный ID градиента (нужен если несколько графиков на странице) */
  gradientId?: string
  /** Единица измерения (отображается в tooltip и на оси Y) */
  unit?: string
  /** Название метрики (отображается в tooltip) */
  label?: string
  /** Высота графика в пикселях */
  height?: number
  /** Максимальное значение на оси Y (для фиксированного масштаба) */
  maxValue?: number
  /** Показывать сетку */
  showGrid?: boolean
  /** Показывать оси */
  showAxis?: boolean
}

/**
 * Кастомный Tooltip для графика
 */
interface CustomTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<{ value?: number; color?: string }>
  label?: string | number
  unit?: string
  metricLabel?: string
}

function CustomTooltip({ active, payload, label, unit, metricLabel }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <Box bg="bg.muted" border="1px solid" borderColor="border.muted" borderRadius="md" p={2} fontSize="sm">
        <Box color="fg.muted">{label}</Box>
        <Box color={payload[0].color} fontWeight="bold">
          {metricLabel}: {payload[0].value?.toFixed(1)}
          {unit}
        </Box>
      </Box>
    )
  }
  return null
}

/**
 * Компонент графика метрик с градиентной заливкой
 * Мемоизирован для предотвращения лишних ререндеров
 *
 * @example
 * ```tsx
 * <MetricsChart
 *   data={[
 *     { time: '10:00', value: 45 },
 *     { time: '11:00', value: 62 },
 *   ]}
 *   color="#3182CE"
 *   label="Напечатано"
 *   unit=" шт."
 * />
 * ```
 */
export const MetricsChart = memo(function MetricsChart({
  data,
  color = '#3182CE',
  gradientId = 'metricGradient',
  unit = '',
  label = 'Значение',
  height = 120,
  maxValue,
  showGrid = true,
  showAxis = true,
}: MetricsChartProps) {
  // Автоматически вычисляем maxValue если не задано
  const calculatedMax = maxValue ?? Math.max(...data.map((d) => d.value), 10) * 1.1

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: showAxis ? 0 : -20, bottom: 5 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.4} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />}
        {showAxis && (
          <>
            <XAxis dataKey="time" stroke="#6B7280" fontSize={10} tickLine={false} axisLine={false} />
            <YAxis
              stroke="#6B7280"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              domain={[0, calculatedMax]}
              tickFormatter={(value) => `${value}${unit}`}
              width={40}
            />
          </>
        )}
        <Tooltip
          content={({ active, payload, label: tooltipLabel }) => (
            <CustomTooltip
              active={active}
              payload={payload as CustomTooltipProps['payload']}
              label={tooltipLabel}
              unit={unit}
              metricLabel={label}
            />
          )}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fillOpacity={1}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
})
