'use client'

import type { OrderStatus } from '@/generated/prisma'
import { Chart, useChart } from '@chakra-ui/charts'
import { Card } from '@chakra-ui/react'
import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts'

interface MonthlyData {
  month: string
  count: number
  byStatus: Record<OrderStatus, number>
}

interface MonthlyOrdersChartProps {
  data: MonthlyData[]
}

export function MonthlyOrdersChart({ data }: MonthlyOrdersChartProps) {
  const chartData = data.map((item) => ({
    month: item.month,
    Новый: item.byStatus.NEW,
    Подтверждён: item.byStatus.CONFIRMED,
    'В обработке': item.byStatus.PROCESSING,
    Отправлен: item.byStatus.SHIPPED,
    Доставлен: item.byStatus.DELIVERED,
    Отменён: item.byStatus.CANCELLED,
  }))

  const chart = useChart({
    data: chartData,
    series: [
      { name: 'Новый', color: 'blue.solid', stackId: 'a' },
      { name: 'Подтверждён', color: 'cyan.solid', stackId: 'a' },
      { name: 'В обработке', color: 'yellow.solid', stackId: 'a' },
      { name: 'Отправлен', color: 'purple.solid', stackId: 'a' },
      { name: 'Доставлен', color: 'green.solid', stackId: 'a' },
      { name: 'Отменён', color: 'red.solid', stackId: 'a' },
    ],
  })

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Динамика заказов за 6 месяцев</Card.Title>
      </Card.Header>
      <Card.Body>
        <Chart.Root maxH="sm" chart={chart}>
          <BarChart data={chart.data}>
            <CartesianGrid stroke={chart.color('border.muted')} vertical={false} />
            <XAxis axisLine={false} tickLine={false} dataKey={chart.key('month')} />
            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: chart.color('bg.muted') }} animationDuration={100} content={<Chart.Tooltip />} />
            <Legend content={<Chart.Legend />} />
            {chart.series.map((item) => (
              <Bar
                key={item.name}
                isAnimationActive={false}
                dataKey={chart.key(item.name)}
                fill={chart.color(item.color)}
                stackId={item.stackId}
              />
            ))}
          </BarChart>
        </Chart.Root>
      </Card.Body>
    </Card.Root>
  )
}
