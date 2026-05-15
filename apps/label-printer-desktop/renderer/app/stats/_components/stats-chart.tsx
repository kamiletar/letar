'use client'

import { Chart, useChart } from '@chakra-ui/charts'
import { Box, Text } from '@chakra-ui/react'
import { memo } from 'react'
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyStats } from '../../../types/electron'

interface StatsChartProps {
  dailyStats: DailyStats[]
}

/**
 * График печати по дням
 * Вынесен в отдельный компонент для динамической загрузки recharts (~500 KB)
 */
export const StatsChart = memo(function StatsChart({ dailyStats }: StatsChartProps) {
  const chart = useChart({
    data: dailyStats,
    series: [
      { name: 'printed', color: 'blue.solid', label: 'Напечатано' },
      { name: 'scanned', color: 'green.solid', label: 'Отсканировано' },
    ],
  })

  if (dailyStats.length === 0) {
    return (
      <Box py={8} textAlign="center">
        <Text color="fg.muted">Нет данных для отображения</Text>
      </Box>
    )
  }

  return (
    <Chart.Root maxH="300px" chart={chart}>
      <AreaChart data={chart.data}>
        <CartesianGrid stroke={chart.color('border.muted')} vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey={chart.key('date')} axisLine={false} tickLine={false} tickMargin={8} />
        <YAxis axisLine={false} tickLine={false} />
        <Tooltip cursor={false} animationDuration={100} content={<Chart.Tooltip />} />
        {chart.series.map((item) => (
          <Area
            key={item.name}
            type="monotone"
            isAnimationActive={false}
            dataKey={chart.key(item.name)}
            fill={chart.color(item.color)}
            fillOpacity={0.2}
            stroke={chart.color(item.color)}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </Chart.Root>
  )
})
