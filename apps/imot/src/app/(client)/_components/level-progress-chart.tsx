/* oxlint-disable no-array-index-key */
'use client'

import type { LevelProgressHistory } from '@/app/_types/client-dashboard.types'
import { imotColors } from '@/lib/theme'
import { Badge, Box, Card, Heading, Stack, Text } from '@chakra-ui/react'

export interface LevelProgressChartProps {
  data: LevelProgressHistory
}

/**
 * Компонент для отображения линейного графика прогресса
 */
export function LevelProgressChart({ data }: LevelProgressChartProps) {
  const { level, metric, data: points } = data

  if (points.length === 0) {
    return null
  }

  // Название уровня на русском
  const levelNames: Record<string, string> = {
    numerology: 'Нумерология',
    neuroPsych: 'Нейропсихология',
    energy: 'Энергетика',
    body: 'Тело',
    style: 'Стиль',
  }

  // Цвета для каждого уровня
  const levelColor = imotColors[level as keyof typeof imotColors]?.primary || '#667eea'

  // Размеры графика
  const width = 100 // процент
  const height = 200 // px
  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const chartWidth = 100 - ((padding.left + padding.right) / width) * 100
  const chartHeight = height - padding.top - padding.bottom

  // Находим min/max значения для нормализации
  const values = points.map((p) => p.value)
  const minValue = Math.min(...values)
  const maxValue = Math.max(...values)
  const valueRange = maxValue - minValue || 1 // Избегаем деления на 0

  // Нормализуем точки для SVG
  const normalizedPoints = points.map((point, index) => {
    const x = (index / (points.length - 1 || 1)) * chartWidth
    const y = chartHeight - ((point.value - minValue) / valueRange) * chartHeight
    return { x, y, value: point.value, date: point.date }
  })

  // Создаем path для линии графика
  const linePath = normalizedPoints
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L'
      return `${command} ${point.x} ${point.y}`
    })
    .join(' ')

  // Создаем path для заполнения области под графиком
  const areaPath = `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`

  // Вычисляем изменение (первое vs последнее значение)
  const firstValue = points[0].value
  const lastValue = points[points.length - 1].value
  const change = lastValue - firstValue
  const changePercent = ((change / firstValue) * 100).toFixed(1)
  const isPositive = change >= 0

  // Форматирование даты
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'short',
    }).format(new Date(date))
  }

  return (
    <Card.Root
      borderTop="4px solid"
      borderTopColor={levelColor}
      bg="white"
      transition="all 0.3s ease"
      _hover={{
        transform: 'translateY(-2px)',
        shadow: 'lg',
      }}
    >
      <Card.Body>
        <Stack gap={3}>
          {/* Заголовок */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={1}>
                {levelNames[level] || level}
              </Text>
              <Heading size="sm">{metric}</Heading>
            </Box>
            <Badge colorPalette={isPositive ? 'green' : 'red'} variant="subtle" size="sm">
              {isPositive ? '↑' : '↓'} {Math.abs(Number(changePercent))}%
            </Badge>
          </Box>

          {/* SVG График */}
          <Box position="relative" w="100%" h={`${height}px`}>
            <svg
              width="100%"
              height={height}
              viewBox={`0 0 ${width} ${height}`}
              preserveAspectRatio="none"
              style={{ overflow: 'visible' }}
            >
              {/* Сетка (горизонтальные линии) */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                  key={ratio}
                  x1="0"
                  y1={padding.top + chartHeight * ratio}
                  x2={width}
                  y2={padding.top + chartHeight * ratio}
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                  strokeDasharray="2,2"
                />
              ))}

              {/* Область под графиком (градиент) */}
              <defs>
                <linearGradient id={`gradient-${level}-${metric}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: levelColor, stopOpacity: 0.3 }} />
                  <stop offset="100%" style={{ stopColor: levelColor, stopOpacity: 0.05 }} />
                </linearGradient>
              </defs>

              <g transform={`translate(${padding.left}, ${padding.top})`}>
                {/* Заполнение области */}
                <path d={areaPath} fill={`url(#gradient-${level}-${metric})`} />

                {/* Линия графика */}
                <path
                  d={linePath}
                  fill="none"
                  stroke={levelColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Точки на графике */}
                {/* oxlint-disable-next-line no-array-index-key */}
                {normalizedPoints.map((point, index) => (
                  <g key={index}>
                    <circle cx={point.x} cy={point.y} r="3" fill="white" stroke={levelColor} strokeWidth="2" />
                    {/* Tooltip on hover */}
                    <title>
                      {formatDate(point.date)}: {point.value}
                    </title>
                  </g>
                ))}
              </g>
            </svg>

            {/* Метки оси Y (значения) */}
            <Box position="absolute" top={padding.top} left="0" h={chartHeight}>
              {[maxValue, minValue].map((value, index) => (
                <Text
                  key={value}
                  position="absolute"
                  top={index === 0 ? '0' : undefined}
                  bottom={index === 1 ? '0' : undefined}
                  fontSize="xs"
                  color="gray.500"
                  transform="translateY(-50%)"
                >
                  {value.toFixed(0)}
                </Text>
              ))}
            </Box>
          </Box>

          {/* Временной диапазон */}
          <Box display="flex" justifyContent="space-between" fontSize="xs" color="gray.500">
            <Text>{formatDate(points[0].date)}</Text>
            <Text>{formatDate(points[points.length - 1].date)}</Text>
          </Box>

          {/* Текущее значение */}
          <Box pt={2} borderTop="1px solid" borderColor="gray.200">
            <Text fontSize="xs" color="gray.600" mb={1}>
              Текущее значение
            </Text>
            <Heading size="lg" color={levelColor}>
              {lastValue.toFixed(1)}
            </Heading>
          </Box>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

/**
 * Контейнер для отображения нескольких графиков
 */
export interface LevelProgressChartsProps {
  histories: LevelProgressHistory[]
}

export function LevelProgressCharts({ histories }: LevelProgressChartsProps) {
  if (histories.length === 0) {
    return (
      <Card.Root bg="white">
        <Card.Body>
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Пока нет данных для построения графиков. Графики появятся после регулярных измерений вашего прогресса.
          </Text>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Box display="grid" gridTemplateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={4}>
      {histories.map((history) => (
        <LevelProgressChart key={`${history.level}-${history.metric}`} data={history} />
      ))}
    </Box>
  )
}
