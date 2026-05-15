'use client'

import { MetricCard } from '@/app/_components/metric-card'
import type { ClientDashboardStats } from '@/app/_types/client-dashboard.types'
import { imotColors } from '@/lib/theme'
import { Badge, Box, Button, Card, Grid, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuArrowRight, LuCalendar, LuCircleCheck, LuClipboardList, LuClock, LuTrendingUp } from 'react-icons/lu'

export interface ClientDashboardStatsProps {
  stats: ClientDashboardStats
}

/**
 * Компонент для отображения статистики клиента на дашборде
 */
export function ClientDashboardStatsDisplay({ stats }: ClientDashboardStatsProps) {
  const { sessions, activePlan, practices, results, levelProgress } = stats

  // Форматирование даты для следующей сессии
  const formatSessionDate = (date: Date) => {
    const d = new Date(date)
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  }

  // Название этапа трансформации на русском
  const stageNames: Record<string, string> = {
    DIAGNOSTICS: 'Диагностика',
    INTEGRATION: 'Интеграция',
    STRATEGY: 'Стратегия',
    PRACTICE: 'Практика',
    RESULT: 'Результат',
  }

  return (
    <Stack gap={6}>
      {/* Основные метрики */}
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Heading size="lg">Ваша статистика</Heading>
          <Box display="flex" gap={2}>
            <Button asChild variant="ghost" size="sm" colorPalette="green">
              <NextLink href="/practices">
                Все практики <LuArrowRight />
              </NextLink>
            </Button>
            <Button asChild variant="ghost" size="sm" colorPalette="orange">
              <NextLink href="/progress">
                Детальный прогресс <LuArrowRight />
              </NextLink>
            </Button>
          </Box>
        </Box>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
          <MetricCard
            title="Сессий проведено"
            value={sessions.completed}
            description={`Всего: ${sessions.total}`}
            icon={<LuCalendar />}
            colorScheme="blue"
          />
          <MetricCard
            title="Практики выполнено"
            value={practices.completed}
            description={`Всего: ${practices.total}`}
            icon={<LuCircleCheck />}
            colorScheme="green"
            trend={
              practices.completionRate > 0
                ? {
                    value: practices.completionRate,
                    isPositive: true,
                  }
                : undefined
            }
          />
          <MetricCard
            title="Текущий этап"
            value={activePlan ? stageNames[activePlan.currentStage] : 'Нет плана'}
            description={activePlan ? `${activePlan.progress}% завершено` : 'Ожидается план'}
            icon={<LuClipboardList />}
            colorScheme="purple"
          />
          <MetricCard
            title="Измерений прогресса"
            value={results.total}
            description={`За месяц: ${results.recentCount}`}
            icon={<LuTrendingUp />}
            colorScheme="orange"
          />
        </SimpleGrid>
      </Box>

      {/* Детальная информация */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
        {/* Следующая сессия */}
        <Card.Root borderTop="4px solid" borderTopColor="blue.500" bg="white">
          <Card.Body>
            <Heading size="md" mb={4}>
              Следующая сессия
            </Heading>
            {sessions.nextSession ? (
              <Stack gap={3}>
                <Box display="flex" alignItems="center" gap={2}>
                  <LuClock size={20} color="#667eea" />
                  <Text fontWeight="medium">{formatSessionDate(sessions.nextSession.date)}</Text>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Text fontSize="sm" color="gray.600">
                    Длительность
                  </Text>
                  <Badge colorPalette="blue" variant="subtle">
                    {sessions.nextSession.duration} мин
                  </Badge>
                </Box>
                {sessions.nextSession.notes && (
                  <Box pt={2} borderTop="1px solid" borderColor="gray.200">
                    <Text fontSize="sm" color="gray.700">
                      {sessions.nextSession.notes}
                    </Text>
                  </Box>
                )}
              </Stack>
            ) : (
              <Text fontSize="sm" color="gray.500">
                Нет запланированных сессий
              </Text>
            )}
          </Card.Body>
          {sessions.total > 0 && (
            <Card.Footer>
              <Button asChild variant="ghost" size="sm" colorPalette="blue">
                <NextLink href="/my-profile">
                  История сессий <LuArrowRight />
                </NextLink>
              </Button>
            </Card.Footer>
          )}
        </Card.Root>

        {/* Активный план трансформации */}
        <Card.Root borderTop="4px solid" borderTopColor="purple.500" bg="white">
          <Card.Body>
            <Heading size="md" mb={4}>
              План трансформации
            </Heading>
            {activePlan ? (
              <Stack gap={3}>
                <Box>
                  <Text fontWeight="medium" fontSize="lg">
                    {activePlan.title}
                  </Text>
                  <Text fontSize="sm" color="gray.500" mt={1}>
                    Начало:{' '}
                    {activePlan.startDate
                      ? new Intl.DateTimeFormat('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        }).format(new Date(activePlan.startDate))
                      : 'не указано'}
                  </Text>
                  {activePlan.targetDate && (
                    <Text fontSize="sm" color="gray.500">
                      Планируемое завершение:{' '}
                      {new Intl.DateTimeFormat('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      }).format(new Date(activePlan.targetDate))}
                    </Text>
                  )}
                </Box>
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Text fontSize="sm" fontWeight="medium">
                      Текущий этап
                    </Text>
                    <Badge colorPalette="purple" variant="solid">
                      {stageNames[activePlan.currentStage]}
                    </Badge>
                  </Box>
                  {/* Прогресс-бар */}
                  <Box w="full" h="8px" bg="gray.200" borderRadius="full" overflow="hidden">
                    <Box h="full" w={`${activePlan.progress}%`} bg="purple.500" transition="width 0.3s ease" />
                  </Box>
                </Box>
              </Stack>
            ) : (
              <Text fontSize="sm" color="gray.500">
                План трансформации еще не создан
              </Text>
            )}
          </Card.Body>
          {activePlan && (
            <Card.Footer>
              <Button asChild variant="ghost" size="sm" colorPalette="purple">
                <NextLink href="/plan">
                  Посмотреть план <LuArrowRight />
                </NextLink>
              </Button>
            </Card.Footer>
          )}
        </Card.Root>
      </Grid>

      {/* Прогресс по уровням */}
      <Box>
        <Heading size="lg" mb={4}>
          Ваш прогресс по уровням
        </Heading>
        {levelProgress.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {levelProgress.map((item) => {
              // Цвета для каждого уровня
              const levelColors: Record<string, { bg: string; color: string }> = {
                numerology: {
                  bg: imotColors.numerology.bg,
                  color: imotColors.numerology.text,
                },
                neuroPsych: {
                  bg: imotColors.neuroPsych.bg,
                  color: imotColors.neuroPsych.text,
                },
                energy: { bg: imotColors.energy.bg, color: imotColors.energy.text },
                body: { bg: imotColors.body.bg, color: imotColors.body.text },
                style: { bg: imotColors.style.bg, color: imotColors.style.text },
              }

              const levelNames: Record<string, string> = {
                numerology: 'Нумерология',
                neuroPsych: 'Нейропсихология',
                energy: 'Энергетика',
                body: 'Тело',
                style: 'Стиль',
              }

              const trendIcon = item.trend === 'up' ? '↑' : item.trend === 'down' ? '↓' : '→'
              const trendColor = item.trend === 'up' ? 'green.500' : item.trend === 'down' ? 'red.500' : 'gray.500'

              return (
                <Card.Root
                  key={`${item.level}-${item.metric}`}
                  borderTop="4px solid"
                  borderTopColor={levelColors[item.level]?.color || 'gray.500'}
                  bg="white"
                >
                  <Card.Body>
                    <Box display="flex" flexDirection="column" gap={2}>
                      <Text fontSize="xs" fontWeight="medium" color="gray.600">
                        {levelNames[item.level] || item.level}
                      </Text>
                      <Text fontSize="sm" fontWeight="medium">
                        {item.metric}
                      </Text>
                      <Box display="flex" alignItems="baseline" gap={2}>
                        <Heading size="xl" color={levelColors[item.level]?.color}>
                          {item.currentValue}
                        </Heading>
                        {item.previousValue !== null && (
                          <Box display="flex" alignItems="center" gap={1}>
                            <Text fontSize="xs" color={trendColor}>
                              {trendIcon}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              {item.change > 0 ? '+' : ''}
                              {item.change}%
                            </Text>
                          </Box>
                        )}
                      </Box>
                      <Text fontSize="xs" color="gray.400">
                        {new Intl.DateTimeFormat('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                        }).format(new Date(item.measuredAt))}
                      </Text>
                    </Box>
                  </Card.Body>
                </Card.Root>
              )
            })}
          </SimpleGrid>
        ) : (
          <Card.Root bg="white">
            <Card.Body>
              <Text fontSize="sm" color="gray.500" textAlign="center">
                Пока нет измерений прогресса. Они появятся после первых сессий с вашим специалистом.
              </Text>
            </Card.Body>
          </Card.Root>
        )}
      </Box>
    </Stack>
  )
}
