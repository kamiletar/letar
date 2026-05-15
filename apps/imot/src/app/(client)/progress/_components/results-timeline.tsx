/* oxlint-disable no-array-index-key, no-explicit-any */
'use client'

import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import { LuActivity, LuBrain, LuCircle, LuHeart, LuSparkles, LuTrendingUp, LuUser } from 'react-icons/lu'

type Result = {
  id: string
  level: string
  metric: string
  value: number
  description?: string | null
  measuredAt: Date
}

interface ResultsTimelineProps {
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
 * Временная шкала результатов
 */
export function ResultsTimeline({ results }: ResultsTimelineProps) {
  // Группировка по датам
  const resultsByDate = results.reduce(
    (acc, result) => {
      const dateKey = new Date(result.measuredAt).toLocaleDateString('ru-RU')
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(result)
      return acc
    },
    {} as Record<string, Result[]>
  )

  // Сортировка дат (от новых к старым)
  const sortedDates = Object.keys(resultsByDate).sort(
    (a, b) =>
      new Date(b.split('.').reverse().join('-')).getTime() - new Date(a.split('.').reverse().join('-')).getTime()
  )

  return (
    <VStack gap={4} align="stretch">
      {sortedDates.map((date, dateIndex) => {
        const dateResults = resultsByDate[date]

        return (
          <Box key={date} position="relative">
            {/* Линия времени */}
            {dateIndex < sortedDates.length - 1 && (
              <Box position="absolute" left="15px" top="40px" bottom="-16px" w="2px" bg="border" />
            )}

            {/* Дата */}
            <HStack gap={3} mb={3}>
              <Box
                w="32px"
                h="32px"
                borderRadius="full"
                bg="#667eea"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
              >
                <LuCircle size={16} color="white" />
              </Box>
              <Text fontSize="lg" fontWeight="medium">
                {date}
              </Text>
            </HStack>

            {/* Результаты за эту дату */}
            <Box ml="48px">
              <VStack gap={3} align="stretch">
                {dateResults.map((result) => {
                  const config = levelConfig[result.level] || levelConfig.overall
                  const Icon = config.icon

                  return (
                    <Box
                      key={result.id}
                      p={4}
                      borderWidth="1px"
                      borderRadius="lg"
                      borderColor={config.color}
                      bg={`${config.color}08`}
                    >
                      <HStack gap={3} align="start">
                        {/* Иконка уровня */}
                        <Box flexShrink={0} pt={1}>
                          <Icon size={20} color={config.color} />
                        </Box>

                        {/* Контент */}
                        <Box flex={1}>
                          <HStack justify="space-between" mb={1}>
                            <Text fontSize="sm" color="fg.muted">
                              {config.name}
                            </Text>
                            <Text fontSize="lg" fontWeight="bold" color={config.color}>
                              {result.value}/10
                            </Text>
                          </HStack>

                          <Text fontWeight="medium" mb={1}>
                            {result.metric}
                          </Text>

                          {result.description && (
                            <Text fontSize="sm" color="fg.muted" whiteSpace="pre-wrap">
                              {result.description}
                            </Text>
                          )}
                        </Box>
                      </HStack>
                    </Box>
                  )
                })}
              </VStack>
            </Box>
          </Box>
        )
      })}
    </VStack>
  )
}
