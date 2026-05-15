/* oxlint-disable no-array-index-key, no-explicit-any */
'use client'

import { Box, Text, VStack } from '@chakra-ui/react'
import { LuActivity, LuBrain, LuHeart, LuSparkles, LuTrendingUp, LuUser } from 'react-icons/lu'

type Result = {
  id: string
  level: string
  metric: string
  value: number
  description?: string | null
  measuredAt: Date
}

interface LevelProgressCardProps {
  level: string
  results: Result[]
}

// Конфигурация уровней
const levelConfig: Record<string, { color: string; icon: any; name: string }> = {
  numerology: { color: '#FF6B6B', icon: LuSparkles, name: 'Нумерология' },
  neuropsych: { color: '#4ECDC4', icon: LuBrain, name: 'Нейропсихология' },
  energy: { color: '#FFE66D', icon: LuActivity, name: 'Энергетика' },
  body: { color: '#95E1D3', icon: LuHeart, name: 'Тело' },
  style: { color: '#F38181', icon: LuUser, name: 'Стиль' },
  overall: { color: '#667eea', icon: LuTrendingUp, name: 'Общий прогресс' },
}

/**
 * Карточка прогресса по уровню
 */
export function LevelProgressCard({ level, results }: LevelProgressCardProps) {
  const config = levelConfig[level] || levelConfig.overall
  const Icon = config.icon

  // Сортировка результатов по дате (от старых к новым для графика)
  const sortedResults = [...results].sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())

  // Группировка по метрикам
  const metricGroups = sortedResults.reduce(
    (acc, result) => {
      if (!acc[result.metric]) {
        acc[result.metric] = []
      }
      acc[result.metric].push(result)
      return acc
    },
    {} as Record<string, Result[]>
  )

  // Последнее значение для каждой метрики
  const latestValues = Object.entries(metricGroups).map(([metric, results]) => ({
    metric,
    value: results[results.length - 1].value,
    previousValue: results.length > 1 ? results[results.length - 2].value : null,
    date: results[results.length - 1].measuredAt,
  }))

  return (
    <Box p={6} borderWidth="2px" borderColor={config.color} borderRadius="lg" bg={`${config.color}08`}>
      <VStack gap={4} align="stretch">
        {/* Заголовок */}
        <Box display="flex" alignItems="center" gap={2}>
          <Icon size={24} color={config.color} />
          <Text fontSize="xl" fontWeight="bold" color={config.color}>
            {config.name}
          </Text>
        </Box>

        {/* Метрики */}
        <VStack gap={3} align="stretch">
          {latestValues.map(({ metric, value, previousValue, date }) => {
            const change = previousValue !== null ? value - previousValue : null
            const changePercent =
              previousValue !== null && previousValue !== 0 ? ((value - previousValue) / previousValue) * 100 : null

            return (
              <Box key={metric}>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Text fontSize="sm" fontWeight="medium">
                    {metric}
                  </Text>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Text fontSize="lg" fontWeight="bold" color={config.color}>
                      {value}/10
                    </Text>
                    {change !== null && (
                      <Text fontSize="sm" color={change > 0 ? '#00A878' : change < 0 ? '#C41E3A' : 'fg.muted'}>
                        {change > 0 ? '+' : ''}
                        {change.toFixed(1)}
                      </Text>
                    )}
                  </Box>
                </Box>

                {/* Прогресс-бар */}
                <Box h="8px" bg="bg.muted" borderRadius="full" overflow="hidden">
                  <Box h="100%" w={`${(value / 10) * 100}%`} bg={config.color} transition="width 0.3s" />
                </Box>

                {/* Дата последнего измерения */}
                <Text fontSize="xs" color="fg.muted" mt={1}>
                  Последнее измерение: {new Date(date).toLocaleDateString('ru-RU')}
                </Text>

                {/* Процент изменения */}
                {changePercent !== null && (
                  <Text
                    fontSize="xs"
                    color={changePercent > 0 ? '#00A878' : changePercent < 0 ? '#C41E3A' : 'fg.muted'}
                    mt={1}
                  >
                    {changePercent > 0 ? '↗' : changePercent < 0 ? '↘' : '→'} {Math.abs(changePercent).toFixed(1)}% с
                    предыдущего измерения
                  </Text>
                )}
              </Box>
            )
          })}
        </VStack>

        {/* Общее количество измерений */}
        <Text fontSize="xs" color="fg.muted" textAlign="center">
          Всего измерений: {results.length}
        </Text>
      </VStack>
    </Box>
  )
}
