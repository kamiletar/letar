'use client'

/**
 * Sparkline график для FPS
 *
 * Компактный график истории FPS для отображения в карточке воркера.
 * Использует @chakra-ui/charts (обёртка над recharts).
 */

import { Chart, useChart } from '@chakra-ui/charts'
import { memo, useMemo } from 'react'
import { Area, AreaChart } from 'recharts'

interface FpsSparklineProps {
  /** История FPS значений */
  data: number[]
  /** Цветовая палитра (по умолчанию green) */
  colorPalette?: 'green' | 'blue' | 'purple'
  /** Ширина графика (по умолчанию 64px) */
  width?: number
  /** Высота графика (по умолчанию 20px) */
  height?: number
}

/** Цвета для разных палитр */
const colorMap = {
  green: 'green.solid',
  blue: 'blue.solid',
  purple: 'purple.solid',
}

/**
 * Мемоизированный компонент sparkline для FPS
 *
 * Показывает историю FPS в виде компактного area chart.
 * Минимум 3 точки для отображения графика.
 */
export const FpsSparkline = memo(
  function FpsSparkline({ data, colorPalette = 'green', width = 64, height = 20 }: FpsSparklineProps) {
    // Преобразуем массив чисел в формат для recharts
    const chartData = useMemo(() => data.map((fps) => ({ fps })), [data])

    const color = colorMap[colorPalette]

    const chart = useChart({
      data: chartData,
      series: [{ name: 'fps', color }],
    })

    // Не показываем график если меньше 3 точек
    if (data.length < 3) {
      return null
    }

    return (
      <Chart.Root width={`${width}px`} height={`${height}px`} chart={chart}>
        <AreaChart data={chart.data}>
          <defs>
            <Chart.Gradient
              id={`fps-gradient-${colorPalette}`}
              stops={[
                { offset: '0%', color, opacity: 0.8 },
                { offset: '100%', color, opacity: 0.1 },
              ]}
            />
          </defs>
          <Area
            isAnimationActive={false}
            dataKey={chart.key('fps')}
            fill={`url(#fps-gradient-${colorPalette})`}
            stroke={chart.color(color)}
            strokeWidth={1.5}
            type="monotone"
          />
        </AreaChart>
      </Chart.Root>
    )
  },
  (prev, next) => {
    // Сравниваем только если данные реально изменились
    if (prev.data.length !== next.data.length) {
      return false
    }
    if (prev.colorPalette !== next.colorPalette) {
      return false
    }
    // Сравниваем последние 3 значения
    const len = prev.data.length
    if (len === 0) {
      return true
    }
    return (
      prev.data[len - 1] === next.data[len - 1]
      && prev.data[Math.max(0, len - 2)] === next.data[Math.max(0, len - 2)]
      && prev.data[Math.max(0, len - 3)] === next.data[Math.max(0, len - 3)]
    )
  },
)
