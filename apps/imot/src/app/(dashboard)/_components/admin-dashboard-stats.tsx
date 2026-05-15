'use client'

import { MetricCard } from '@/app/_components/metric-card'
import type { AdminDashboardStats } from '@/app/_types/admin-dashboard.types'
import { Badge, Box, Card, Grid, Heading, SimpleGrid, Stack, Table, Text } from '@chakra-ui/react'
import { LuActivity, LuCalendar, LuCircleCheck, LuClipboardList, LuUserCheck, LuUsers } from 'react-icons/lu'

export interface AdminDashboardStatsProps {
  stats: AdminDashboardStats
}

/**
 * Компонент для отображения статистики администратора на дашборде
 */
export function AdminDashboardStats({ stats }: AdminDashboardStatsProps) {
  const { users, clients, sessions, plans, practices, specialistActivity } = stats

  // Названия этапов трансформации
  const stageNames: Record<string, string> = {
    DIAGNOSTICS: 'Диагностика',
    INTEGRATION: 'Интеграция',
    STRATEGY: 'Стратегия',
    PRACTICE: 'Практика',
    RESULT: 'Результат',
  }

  // Названия статусов сессий
  const statusNames: Record<string, string> = {
    SCHEDULED: 'Запланировано',
    IN_PROGRESS: 'В процессе',
    COMPLETED: 'Завершено',
    CANCELLED: 'Отменено',
  }

  // Форматирование даты
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(date))
  }

  return (
    <Stack gap={6}>
      {/* Основные метрики */}
      <Box>
        <Heading size="lg" mb={4}>
          Основная статистика
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={4}>
          <MetricCard
            title="Всего пользователей"
            value={users.total}
            description={`Клиентов: ${users.clients}, Специалистов: ${users.specialists}`}
            icon={<LuUsers />}
            colorScheme="blue"
          />
          <MetricCard
            title="Записей клиентов"
            value={clients.total}
            description={`Среднее профилей: ${clients.averageProfilesPerClient}`}
            icon={<LuUserCheck />}
            colorScheme="green"
          />
          <MetricCard
            title="Всего сессий"
            value={sessions.total}
            description={`За месяц: ${sessions.thisMonth}, За неделю: ${sessions.thisWeek}`}
            icon={<LuCalendar />}
            colorScheme="purple"
          />
          <MetricCard
            title="Планов трансформации"
            value={plans.total}
            description={`Активных: ${plans.active}, Завершено: ${plans.completed}`}
            icon={<LuClipboardList />}
            colorScheme="orange"
          />
        </SimpleGrid>
      </Box>

      {/* Детальная статистика */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
        {/* Статистика пользователей по ролям */}
        <Card.Root borderTop="4px solid" borderTopColor="blue.500" bg="white">
          <Card.Body>
            <Heading size="md" mb={4}>
              Пользователи по ролям
            </Heading>
            <Stack gap={3}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Text fontSize="sm" color="gray.600">
                  Клиенты
                </Text>
                <Badge colorPalette="green" variant="subtle" size="lg">
                  {users.clients}
                </Badge>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Text fontSize="sm" color="gray.600">
                  Специалисты
                </Text>
                <Badge colorPalette="blue" variant="subtle" size="lg">
                  {users.specialists}
                </Badge>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Text fontSize="sm" color="gray.600">
                  Администраторы
                </Text>
                <Badge colorPalette="purple" variant="subtle" size="lg">
                  {users.admins}
                </Badge>
              </Box>
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Статистика сессий */}
        <Card.Root borderTop="4px solid" borderTopColor="purple.500" bg="white">
          <Card.Body>
            <Heading size="md" mb={4}>
              Статистика сессий
            </Heading>
            <Stack gap={3}>
              {Object.entries(sessions.byStatus).map(([status, count]) => (
                <Box key={status} display="flex" justifyContent="space-between" alignItems="center">
                  <Text fontSize="sm" color="gray.600">
                    {statusNames[status] || status}
                  </Text>
                  <Badge colorPalette="purple" variant="subtle" size="lg">
                    {count}
                  </Badge>
                </Box>
              ))}
            </Stack>
          </Card.Body>
        </Card.Root>
      </Grid>

      {/* Статистика профилей и планов */}
      <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
        {/* Статистика профилей клиентов */}
        <Card.Root borderTop="4px solid" borderTopColor="green.500" bg="white">
          <Card.Body>
            <Heading size="md" mb={4}>
              Профили клиентов
            </Heading>
            <Stack gap={3}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Text fontSize="sm" color="gray.600">
                  Нумерология
                </Text>
                <Badge colorPalette="red" variant="subtle" size="lg">
                  {clients.withProfiles.numerology}
                </Badge>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Text fontSize="sm" color="gray.600">
                  Нейропсихология
                </Text>
                <Badge colorPalette="cyan" variant="subtle" size="lg">
                  {clients.withProfiles.neuroPsych}
                </Badge>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Text fontSize="sm" color="gray.600">
                  Энергетика
                </Text>
                <Badge colorPalette="yellow" variant="subtle" size="lg">
                  {clients.withProfiles.energy}
                </Badge>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Text fontSize="sm" color="gray.600">
                  Тело
                </Text>
                <Badge colorPalette="green" variant="subtle" size="lg">
                  {clients.withProfiles.body}
                </Badge>
              </Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Text fontSize="sm" color="gray.600">
                  Стиль
                </Text>
                <Badge colorPalette="pink" variant="subtle" size="lg">
                  {clients.withProfiles.style}
                </Badge>
              </Box>
            </Stack>
          </Card.Body>
        </Card.Root>

        {/* Статистика планов по этапам */}
        <Card.Root borderTop="4px solid" borderTopColor="orange.500" bg="white">
          <Card.Body>
            <Heading size="md" mb={4}>
              Планы по этапам
            </Heading>
            <Stack gap={3}>
              {Object.entries(plans.byStage).map(([stage, count]) => (
                <Box key={stage} display="flex" justifyContent="space-between" alignItems="center">
                  <Text fontSize="sm" color="gray.600">
                    {stageNames[stage] || stage}
                  </Text>
                  <Badge colorPalette="orange" variant="subtle" size="lg">
                    {count}
                  </Badge>
                </Box>
              ))}
            </Stack>
          </Card.Body>
        </Card.Root>
      </Grid>

      {/* Практики */}
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
        <MetricCard
          title="Всего практик"
          value={practices.total}
          description={`Завершено: ${practices.completed}`}
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
          title="Процент завершения"
          value={`${practices.completionRate}%`}
          description="Общий показатель"
          icon={<LuActivity />}
          colorScheme="blue"
        />
      </SimpleGrid>

      {/* Активность специалистов */}
      <Box>
        <Heading size="lg" mb={4}>
          Активность специалистов
        </Heading>
        <Card.Root bg="white">
          <Card.Body p={0}>
            {specialistActivity.length > 0 ? (
              <Table.Root variant="outline" size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Специалист</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">Клиентов</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">Сессий</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">Планов</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {specialistActivity.map((specialist) => (
                    <Table.Row key={specialist.id}>
                      <Table.Cell>
                        <Box>
                          <Text fontWeight="medium" fontSize="sm">
                            {specialist.name || 'Без имени'}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {specialist.email}
                          </Text>
                        </Box>
                      </Table.Cell>
                      <Table.Cell textAlign="center">
                        <Badge colorPalette="blue" variant="subtle">
                          {specialist.clientCount}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell textAlign="center">
                        <Badge colorPalette="purple" variant="subtle">
                          {specialist.sessionCount}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell textAlign="center">
                        <Badge colorPalette="orange" variant="subtle">
                          {specialist.planCount}
                        </Badge>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            ) : (
              <Box p={4}>
                <Text fontSize="sm" color="gray.500" textAlign="center">
                  Пока нет специалистов в системе
                </Text>
              </Box>
            )}
          </Card.Body>
        </Card.Root>
      </Box>

      {/* Недавние пользователи */}
      <Box>
        <Heading size="lg" mb={4}>
          Недавние регистрации
        </Heading>
        <Card.Root bg="white">
          <Card.Body p={0}>
            {users.recentUsers.length > 0 ? (
              <Table.Root variant="outline" size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Пользователь</Table.ColumnHeader>
                    <Table.ColumnHeader>Роль</Table.ColumnHeader>
                    <Table.ColumnHeader>Дата регистрации</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {users.recentUsers.map((user) => (
                    <Table.Row key={user.id}>
                      <Table.Cell>
                        <Box>
                          <Text fontWeight="medium" fontSize="sm">
                            {user.name || 'Без имени'}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {user.email}
                          </Text>
                        </Box>
                      </Table.Cell>
                      <Table.Cell>
                        <Badge
                          colorPalette={
                            user.role === 'ADMIN' ? 'purple' : user.role === 'SPECIALIST' ? 'blue' : 'green'
                          }
                          variant="subtle"
                        >
                          {user.role === 'ADMIN'
                            ? 'Администратор'
                            : user.role === 'SPECIALIST'
                              ? 'Специалист'
                              : 'Клиент'}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm" color="gray.600">
                          {formatDate(user.createdAt)}
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            ) : (
              <Box p={4}>
                <Text fontSize="sm" color="gray.500" textAlign="center">
                  Пока нет пользователей
                </Text>
              </Box>
            )}
          </Card.Body>
        </Card.Root>
      </Box>
    </Stack>
  )
}
