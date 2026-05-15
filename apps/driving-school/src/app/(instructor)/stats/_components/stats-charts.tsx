'use client'

import { Chart, useChart } from '@chakra-ui/charts'
import { Card, Heading, HStack, SimpleGrid, VStack } from '@chakra-ui/react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, Tooltip, XAxis, YAxis } from 'recharts'
import type { DailyLessonData, LessonStats } from '../_actions/stats.action'

interface StatsChartsProps {
  lessons: LessonStats
  dailyData: DailyLessonData[]
}

export function StatsCharts({ lessons, dailyData }: StatsChartsProps) {
  return (
    <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
      <LessonsDistributionChart lessons={lessons} />
      <DailyLessonsChart dailyData={dailyData} />
    </SimpleGrid>
  )
}

// Круговая диаграмма распределения занятий по статусам
function LessonsDistributionChart({ lessons }: { lessons: LessonStats }) {
  const chart = useChart({
    data: [
      { name: 'Завершено', value: lessons.completed, color: 'green.solid' },
      { name: 'Подтверждено', value: lessons.confirmed, color: 'blue.solid' },
      { name: 'Ожидает', value: lessons.pending, color: 'yellow.solid' },
      { name: 'Отменено', value: lessons.cancelled, color: 'orange.solid' },
      { name: 'Неявки', value: lessons.noShow, color: 'red.solid' },
      { name: 'Перенесено', value: lessons.rescheduled, color: 'purple.solid' },
    ].filter((item) => item.value > 0), // Фильтруем нулевые значения
  })

  if (lessons.total === 0) {
    return (
      <Card.Root>
        <Card.Body>
          <VStack py={8}>
            <Heading size="md" color="fg.muted">
              Нет данных для отображения
            </Heading>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root>
      <Card.Header>
        <Heading size="md">Распределение по статусам</Heading>
      </Card.Header>
      <Card.Body>
        <Chart.Root height="300px" chart={chart}>
          <PieChart>
            <Tooltip cursor={false} animationDuration={100} content={<Chart.Tooltip hideLabel />} />
            <Legend content={<Chart.Legend />} />
            <Pie
              innerRadius={60}
              outerRadius={100}
              isAnimationActive={false}
              data={chart.data}
              dataKey={chart.key('value')}
              nameKey="name"
              paddingAngle={2}
              cornerRadius={4}
            >
              {chart.data.map((item) => (
                <Cell key={item.name} fill={chart.color(item.color)} />
              ))}
            </Pie>
          </PieChart>
        </Chart.Root>
      </Card.Body>
    </Card.Root>
  )
}

// Столбчатая диаграмма занятий по дням
function DailyLessonsChart({ dailyData }: { dailyData: DailyLessonData[] }) {
  const chart = useChart({
    data: dailyData.map((item) => ({
      ...item,
      // Форматируем дату для отображения
      dateLabel: formatDate(item.date),
    })),
    series: [
      { name: 'completed', color: 'green.solid', stackId: 'a' },
      { name: 'cancelled', color: 'orange.solid', stackId: 'a' },
      { name: 'noShow', color: 'red.solid', stackId: 'a' },
    ],
  })

  const hasData = dailyData.some((d) => d.completed > 0 || d.cancelled > 0 || d.noShow > 0)

  if (!hasData) {
    return (
      <Card.Root>
        <Card.Header>
          <Heading size="md">Занятия по дням</Heading>
        </Card.Header>
        <Card.Body>
          <VStack py={8}>
            <Heading size="md" color="fg.muted">
              Нет данных за выбранный период
            </Heading>
          </VStack>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="md">Занятия по дням</Heading>
        </HStack>
      </Card.Header>
      <Card.Body>
        <Chart.Root height="300px" chart={chart}>
          <BarChart data={chart.data}>
            <CartesianGrid stroke={chart.color('border.muted')} vertical={false} />
            <XAxis
              axisLine={false}
              tickLine={false}
              dataKey={chart.key('dateLabel')}
              fontSize={12}
              interval="preserveStartEnd"
            />
            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: chart.color('bg.muted') }} animationDuration={100} content={<Chart.Tooltip />} />
            <Legend
              content={
                <Chart.Legend
                  payload={[
                    { value: 'Завершено', color: chart.color('green.solid') },
                    { value: 'Отменено', color: chart.color('orange.solid') },
                    { value: 'Неявки', color: chart.color('red.solid') },
                  ]}
                />
              }
            />
            {chart.series.map((item) => (
              <Bar
                key={item.name}
                isAnimationActive={false}
                dataKey={chart.key(item.name)}
                fill={chart.color(item.color)}
                stackId={item.stackId}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </Chart.Root>
      </Card.Body>
    </Card.Root>
  )
}

// Форматирование даты
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
}
