'use client'

import { MetricCard } from '@/app/_components/metric-card'
import { UserAvatar } from '@/app/_components/user-avatar'
import type { AdminStats } from '@/app/_types/admin-analytics.types'
import { imotColors } from '@/lib/theme'
import { Badge, Box, Button, Grid, Heading, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { default as Link, default as NextLink } from 'next/link'
import { LuArrowRight, LuCalendar, LuClipboardList, LuUserCheck, LuUserCog, LuUsers } from 'react-icons/lu'

export interface AdminDashboardStatsProps {
  stats: AdminStats
}

/**
 * Компонент для отображения статистики администратора
 */
export function AdminDashboardStats({ stats }: AdminDashboardStatsProps) {
  const {
    totalUsers,
    usersByRole,
    totalClients,
    activeClients,
    totalSpecialists,
    activeSpecialists,
    totalSessions,
    sessionsByStatus,
    totalPlans,
    plansByStage,
    topSpecialists,
    recentUsers,
  } = stats

  return (
    <Stack gap={6}>
      {/* Основные метрики */}
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Heading size="lg">Общая статистика системы</Heading>
          <Box display="flex" gap={2}>
            <Button asChild variant="ghost" size="sm" colorPalette="blue">
              <NextLink href="/users">
                Все пользователи <LuArrowRight />
              </NextLink>
            </Button>
            <Button asChild variant="ghost" size="sm" colorPalette="purple">
              <NextLink href="/specialists">
                Специалисты <LuArrowRight />
              </NextLink>
            </Button>
          </Box>
        </Box>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
          <MetricCard
            title="Всего пользователей"
            value={totalUsers}
            description={`Клиентов: ${usersByRole.client}, Специалистов: ${usersByRole.specialist}`}
            icon={<LuUsers />}
            colorScheme="blue"
          />
          <MetricCard
            title="Всего клиентов"
            value={totalClients}
            description={`Активных: ${activeClients}`}
            icon={<LuUserCheck />}
            colorScheme="green"
          />
          <MetricCard
            title="Специалистов"
            value={totalSpecialists}
            description={`Активных: ${activeSpecialists}`}
            icon={<LuUserCog />}
            colorScheme="purple"
          />
          <MetricCard
            title="Всего сессий"
            value={totalSessions}
            description={`Запланировано: ${sessionsByStatus.scheduled}`}
            icon={<LuCalendar />}
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
                {sessionsByStatus.scheduled}
              </Badge>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Text fontSize="sm" color="gray.600">
                В процессе
              </Text>
              <Badge colorPalette="orange" variant="subtle" size="lg">
                {sessionsByStatus.inProgress}
              </Badge>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Text fontSize="sm" color="gray.600">
                Завершено
              </Text>
              <Badge colorPalette="green" variant="subtle" size="lg">
                {sessionsByStatus.completed}
              </Badge>
            </Box>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Text fontSize="sm" color="gray.600">
                Отменено
              </Text>
              <Badge colorPalette="gray" variant="subtle" size="lg">
                {sessionsByStatus.cancelled}
              </Badge>
            </Box>
          </Stack>
        </Box>

        {/* Статистика планов по этапам */}
        <Box p={6} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="white">
          <Heading size="md" mb={4}>
            Планы по этапам трансформации
          </Heading>
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

      {/* Топ специалистов и недавние пользователи */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
        {/* Топ 5 специалистов */}
        <Box p={6} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="white">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="md">Топ специалисты</Heading>
            <Link href="/specialists" style={{ fontSize: '14px', color: '#667eea' }}>
              Все специалисты →
            </Link>
          </Box>
          {topSpecialists.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              Нет специалистов
            </Text>
          ) : (
            <Stack gap={3}>
              {topSpecialists.map((specialist) => (
                <Box key={specialist.id} p={3} borderWidth="1px" borderRadius="md" borderColor="gray.200">
                  <Box display="flex" alignItems="center" gap={3}>
                    <UserAvatar name={specialist.name} src={null} size="sm" />
                    <Box flex="1">
                      <Text fontWeight="medium" fontSize="sm">
                        {specialist.name}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {specialist.email}
                      </Text>
                    </Box>
                    <Box display="flex" gap={2}>
                      <Badge colorPalette="blue" size="sm">
                        {specialist.clientCount} кл.
                      </Badge>
                      <Badge colorPalette="purple" size="sm">
                        {specialist.sessionCount} сес.
                      </Badge>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Box>

        {/* Недавно зарегистрированные пользователи */}
        <Box p={6} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="white">
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
            <Heading size="md">Новые пользователи</Heading>
            <Link href="/users" style={{ fontSize: '14px', color: '#667eea' }}>
              Все пользователи →
            </Link>
          </Box>
          {recentUsers.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              Нет пользователей
            </Text>
          ) : (
            <Stack gap={3}>
              {recentUsers.map((user) => (
                <Box key={user.id} p={3} borderWidth="1px" borderRadius="md" borderColor="gray.200">
                  <Box display="flex" alignItems="center" gap={3}>
                    <UserAvatar name={user.name} src={null} size="sm" />
                    <Box flex="1">
                      <Text fontWeight="medium" fontSize="sm">
                        {user.name}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {user.email}
                      </Text>
                    </Box>
                    <Badge
                      colorPalette={user.role === 'ADMIN' ? 'red' : user.role === 'SPECIALIST' ? 'purple' : 'blue'}
                      size="sm"
                    >
                      {user.role === 'ADMIN' ? 'Админ' : user.role === 'SPECIALIST' ? 'Специалист' : 'Клиент'}
                    </Badge>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Grid>

      {/* Дополнительная метрика - планы трансформации */}
      <Box p={6} borderWidth="1px" borderRadius="lg" borderColor="gray.200" bg="white">
        <Heading size="md" mb={4}>
          <LuClipboardList style={{ display: 'inline', marginRight: '8px' }} />
          Планы трансформации
        </Heading>
        <Text fontSize="lg" fontWeight="bold" color="blue.600">
          {totalPlans}
        </Text>
        <Text fontSize="sm" color="gray.600">
          Всего планов в системе
        </Text>
      </Box>
    </Stack>
  )
}
