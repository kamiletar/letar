'use client'

import { MetricCard } from '@/app/_components/metric-card'
import { SessionCard } from '@/app/_components/session-card'
import { UserAvatar } from '@/app/_components/user-avatar'
import { imotColors } from '@/lib/theme'
import { Badge, Box, Button, Grid, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { default as Link, default as NextLink } from 'next/link'
import { LuArrowRight, LuCalendar, LuClipboardList, LuUserCheck, LuUsers } from 'react-icons/lu'
import type { SpecialistStats } from '../_types/analytics.types'

export interface DashboardStatsProps {
  stats: SpecialistStats
}

/**
 * Компонент для отображения статистики специалиста на дашборде
 */
export function DashboardStats({ stats }: DashboardStatsProps) {
  const {
    totalClients,
    activeClients,
    inactiveClients: _inactiveClients,
    totalSessions,
    scheduledSessions,
    completedSessions,
    totalPlans,
    plansByStage,
    recentClients,
    upcomingSessions,
  } = stats

  return (
    <Stack gap={6}>
      {/* Основные метрики */}
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Heading size="lg">Основная статистика</Heading>
          <Box display="flex" gap={2}>
            <Button asChild variant="ghost" size="sm" colorPalette="blue">
              <NextLink href="/clients">
                Все клиенты <LuArrowRight />
              </NextLink>
            </Button>
            <Button asChild variant="ghost" size="sm" colorPalette="purple">
              <NextLink href="/sessions">
                Все сессии <LuArrowRight />
              </NextLink>
            </Button>
            <Button asChild variant="ghost" size="sm" colorPalette="orange">
              <NextLink href="/plans">
                Все планы <LuArrowRight />
              </NextLink>
            </Button>
          </Box>
        </Box>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
          <MetricCard
            title="Всего клиентов"
            value={totalClients}
            description="Общее количество"
            icon={<LuUsers />}
            colorScheme="blue"
          />
          <MetricCard
            title="Активные клиенты"
            value={activeClients}
            description="С незавершенными планами"
            icon={<LuUserCheck />}
            colorScheme="green"
          />
          <MetricCard
            title="Всего сессий"
            value={totalSessions}
            description={`Запланировано: ${scheduledSessions}`}
            icon={<LuCalendar />}
            colorScheme="purple"
          />
          <MetricCard
            title="Планов трансформации"
            value={totalPlans}
            description={`Завершено: ${plansByStage.result}`}
            icon={<LuClipboardList />}
            colorScheme="orange"
          />
        </SimpleGrid>
      </Box>

      {/* Детальная статистика */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
        {/* Статистика сессий */}
        <Box p={6} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="white">
          <Heading size="md" mb={4}>
            Статистика сессий
          </Heading>
          <Stack gap={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Text fontSize="sm" color="gray.600">
                Запланировано
              </Text>
              <Badge colorPalette="blue" variant="subtle" size="lg">
                {scheduledSessions}
              </Badge>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Text fontSize="sm" color="gray.600">
                В процессе
              </Text>
              <Badge colorPalette="orange" variant="subtle" size="lg">
                {stats.inProgressSessions}
              </Badge>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Text fontSize="sm" color="gray.600">
                Завершено
              </Text>
              <Badge colorPalette="green" variant="subtle" size="lg">
                {completedSessions}
              </Badge>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Text fontSize="sm" color="gray.600">
                Отменено
              </Text>
              <Badge colorPalette="gray" variant="subtle" size="lg">
                {stats.cancelledSessions}
              </Badge>
            </Box>
          </Stack>
        </Box>

        {/* Статистика планов по этапам */}
        <Box p={6} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="white">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="md">Планы по этапам трансформации</Heading>
            <Link href="/plans" style={{ fontSize: '14px', color: '#667eea' }}>
              Все планы →
            </Link>
          </Box>
          <Stack gap={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Text fontSize="sm" color="gray.600">
                Диагностика
              </Text>
              <Badge
                colorPalette="blue"
                variant="subtle"
                size="lg"
                style={{ backgroundColor: imotColors.numerology.bg }}
              >
                {plansByStage.diagnostics}
              </Badge>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Text fontSize="sm" color="gray.600">
                Интеграция
              </Text>
              <Badge
                colorPalette="purple"
                variant="subtle"
                size="lg"
                style={{ backgroundColor: imotColors.integration.bg }}
              >
                {plansByStage.integration}
              </Badge>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Text fontSize="sm" color="gray.600">
                Стратегия
              </Text>
              <Badge colorPalette="orange" variant="subtle" size="lg" style={{ backgroundColor: imotColors.energy.bg }}>
                {plansByStage.strategy}
              </Badge>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Text fontSize="sm" color="gray.600">
                Практика
              </Text>
              <Badge colorPalette="green" variant="subtle" size="lg" style={{ backgroundColor: imotColors.body.bg }}>
                {plansByStage.practice}
              </Badge>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Text fontSize="sm" color="gray.600">
                Результат
              </Text>
              <Badge colorPalette="green" variant="solid" size="lg">
                {plansByStage.result}
              </Badge>
            </Box>
          </Stack>
        </Box>
      </Grid>

      {/* Недавние клиенты и предстоящие сессии */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
        {/* Недавние клиенты */}
        <Box p={6} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="white">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="md">Недавние клиенты</Heading>
            <Link href="/clients" style={{ fontSize: '14px', color: '#667eea' }}>
              Все клиенты →
            </Link>
          </Box>
          {recentClients.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              Пока нет клиентов
            </Text>
          ) : (
            <Stack gap={3}>
              {recentClients.map((client) => (
                <Link key={client.id} href={`/clients/${client.id}`}>
                  <Box
                    p={3}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor="gray.200"
                    transition="all 0.2s"
                    _hover={{
                      borderColor: 'blue.400',
                      shadow: 'sm',
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={3}>
                      <UserAvatar name={client.name} src={null} size="sm" />
                      <Box flex="1">
                        <Text fontWeight="medium" fontSize="sm">
                          {client.name}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {client.email}
                        </Text>
                      </Box>
                      <Box display="flex" gap={1}>
                        {client.hasNumerology && (
                          <Badge size="sm" colorPalette="blue">
                            Н
                          </Badge>
                        )}
                        {client.hasNeuroPsych && (
                          <Badge size="sm" colorPalette="cyan">
                            П
                          </Badge>
                        )}
                        {client.hasEnergy && (
                          <Badge size="sm" colorPalette="yellow">
                            Э
                          </Badge>
                        )}
                        {client.hasBody && (
                          <Badge size="sm" colorPalette="green">
                            Т
                          </Badge>
                        )}
                        {client.hasStyle && (
                          <Badge size="sm" colorPalette="pink">
                            С
                          </Badge>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Link>
              ))}
            </Stack>
          )}
        </Box>

        {/* Предстоящие сессии */}
        <Box p={6} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="white">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="md">Предстоящие сессии</Heading>
            <Link href="/sessions" style={{ fontSize: '14px', color: '#667eea' }}>
              Все сессии →
            </Link>
          </Box>
          {upcomingSessions.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              Нет предстоящих сессий
            </Text>
          ) : (
            <Stack gap={3}>
              {upcomingSessions.map((session) => (
                <Link key={session.id} href={`/sessions/${session.id}`}>
                  <SessionCard
                    id={session.id}
                    title={session.client.name}
                    scheduledAt={session.scheduledAt}
                    duration={session.duration}
                    status={session.status}
                    clientName={session.client.name}
                    showDetailsButton={false}
                  />
                </Link>
              ))}
            </Stack>
          )}
        </Box>
      </Grid>
    </Stack>
  )
}
