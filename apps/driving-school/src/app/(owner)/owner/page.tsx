import {
  type AlertItem,
  AlertsPanel,
  createCancellationAlert,
  createDebtAlert,
  createNoShowAlert,
} from '@/app/_components/alerts-panel'
import { prisma } from '@/lib/db'
import { Box, Card, Grid, Heading, HStack, Text, VStack } from '@chakra-ui/react'

import { OwnerDashboardStats, OwnerRoleStats } from './_components/owner-dashboard-stats'

export const metadata = {
  title: 'Панель владельца',
  description: 'Статистика и управление платформой',
}

// Статистика за последние 7 и 30 дней с трендами
async function getStats() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    newUsersWeek,
    newUsersPrevWeek,
    newUsersMonth,
    totalSchools,
    schoolsWeekAgo,
    totalLessons,
    lessonsWeek,
    lessonsPrevWeek,
    lessonsMonth,
    openTickets,
    openTicketsWeekAgo,
    totalTickets,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo }, deletedAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo }, deletedAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: monthAgo }, deletedAt: null } }),
    prisma.organization.count(),
    prisma.organization.count({ where: { createdAt: { lt: weekAgo } } }),
    prisma.lesson.count(),
    prisma.lesson.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.lesson.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.lesson.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] }, createdAt: { lt: weekAgo } } }),
    prisma.supportTicket.count(),
  ])

  // Подсчёт по ролям — один проход вместо 4x filter()
  const usersWithRoles = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { roles: true },
  })

  const roleStats = usersWithRoles.reduce(
    (acc, user) => {
      if (user.roles.includes('USER')) {
        acc.users++
      }
      if (user.roles.includes('FREELANCE_INSTRUCTOR')) {
        acc.freelanceInstructors++
      }
      if (user.roles.includes('MODERATOR')) {
        acc.moderators++
      }
      if (user.roles.includes('OWNER')) {
        acc.owners++
      }
      return acc
    },
    { users: 0, freelanceInstructors: 0, moderators: 0, owners: 0 }
  )

  // Данные для sparkline (занятия по дням за последние 7 дней) — один запрос
  const sparklineStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  sparklineStart.setHours(0, 0, 0, 0)
  const recentLessonDates = await prisma.lesson.findMany({
    where: { createdAt: { gte: sparklineStart } },
    select: { createdAt: true },
  })
  const dailyLessons = Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    return recentLessonDates.filter((l) => l.createdAt >= dayStart && l.createdAt < dayEnd).length
  })

  return {
    users: {
      total: totalUsers,
      newWeek: newUsersWeek,
      newPrevWeek: newUsersPrevWeek,
      newMonth: newUsersMonth,
    },
    schools: {
      total: totalSchools,
      weekAgo: schoolsWeekAgo,
    },
    lessons: {
      total: totalLessons,
      week: lessonsWeek,
      prevWeek: lessonsPrevWeek,
      month: lessonsMonth,
      dailySparkline: dailyLessons,
    },
    tickets: {
      open: openTickets,
      openWeekAgo: openTicketsWeekAgo,
      total: totalTickets,
    },
    roles: roleStats,
  }
}

// Получение критичных алертов
async function getAlerts(): Promise<AlertItem[]> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const alerts: AlertItem[] = []

  // Долги > 7 дней — ученики с неоплаченными записями на курс
  const overdueEnrollments = await prisma.courseEnrollment.findMany({
    where: {
      createdAt: { lt: weekAgo },
    },
    select: {
      totalPrice: true,
      paidAmount: true,
      progressId: true,
    },
  })
  // Фильтруем тех, у кого paidAmount < totalPrice (Decimal → Number)
  const debtEnrollments = overdueEnrollments.filter((e) => Number(e.paidAmount) < Number(e.totalPrice))
  if (debtEnrollments.length > 0) {
    // Считаем уникальных учеников и суммарный долг
    const uniqueStudents = new Set(debtEnrollments.map((e) => e.progressId))
    const totalDebt = debtEnrollments.reduce((sum, e) => sum + (Number(e.totalPrice) - Number(e.paidAmount)), 0)
    alerts.push(createDebtAlert(uniqueStudents.size, Math.round(totalDebt)))
  }

  // Отмены сегодня
  const cancellationsToday = await prisma.lesson.count({
    where: {
      status: 'CANCELLED',
      updatedAt: { gte: todayStart },
    },
  })

  if (cancellationsToday > 0) {
    alerts.push(createCancellationAlert(cancellationsToday))
  }

  // Неявки за неделю (startTime в связанной модели TimeSlot)
  const noShowsWeek = await prisma.lesson.count({
    where: {
      status: 'NO_SHOW',
      slot: {
        startTime: { gte: weekAgo },
      },
    },
  })

  if (noShowsWeek > 0) {
    alerts.push(createNoShowAlert(noShowsWeek))
  }

  return alerts
}

// Последние события
async function getRecentActivity() {
  const [recentUsers, recentLessons, recentTickets] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, roles: true, createdAt: true },
    }),
    prisma.lesson.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        createdAt: true,
        student: { select: { name: true } },
        instructor: { select: { name: true } },
      },
    }),
    prisma.supportTicket.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, subject: true, status: true, category: true, createdAt: true },
    }),
  ])

  return { recentUsers, recentLessons, recentTickets }
}

export default async function OwnerDashboardPage() {
  const [stats, activity, alerts] = await Promise.all([getStats(), getRecentActivity(), getAlerts()])

  return (
    <>
      {/* Критичные алерты */}
      {alerts.length > 0 && <AlertsPanel alerts={alerts} />}

      {/* Заголовок */}
      <Box>
        <Heading size="xl">Обзор платформы</Heading>
        <Text color="fg.muted" mt={2}>
          Статистика и последняя активность
        </Text>
      </Box>

      {/* Карточки со статистикой (Client Component для иконок) */}
      <OwnerDashboardStats stats={stats} />

      {/* Распределение по ролям (Client Component) */}
      <Card.Root>
        <Card.Header>
          <Heading size="md">Распределение пользователей по ролям</Heading>
        </Card.Header>
        <Card.Body>
          <OwnerRoleStats roles={stats.roles} />
        </Card.Body>
      </Card.Root>

      {/* Последняя активность */}
      <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={6}>
        {/* Новые пользователи */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Новые пользователи</Heading>
          </Card.Header>
          <Card.Body>
            <VStack align="stretch" gap={3}>
              {activity.recentUsers.map((user) => (
                <HStack key={user.id} justify="space-between">
                  <Box>
                    <Text fontWeight="medium">{user.name}</Text>
                    <Text fontSize="sm" color="fg.muted">
                      {user.email}
                    </Text>
                  </Box>
                  <Text fontSize="xs" color="fg.muted">
                    {formatDate(user.createdAt)}
                  </Text>
                </HStack>
              ))}
              {activity.recentUsers.length === 0 && (
                <Text color="fg.muted" textAlign="center">
                  Нет новых пользователей
                </Text>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Последние обращения */}
        <Card.Root>
          <Card.Header>
            <Heading size="md">Последние обращения</Heading>
          </Card.Header>
          <Card.Body>
            <VStack align="stretch" gap={3}>
              {activity.recentTickets.map((ticket) => (
                <HStack key={ticket.id} justify="space-between">
                  <Box>
                    <Text fontWeight="medium" lineClamp={1}>
                      {ticket.subject}
                    </Text>
                    <Text fontSize="sm" color="fg.muted">
                      {ticket.category} • {getTicketStatusLabel(ticket.status)}
                    </Text>
                  </Box>
                  <Text fontSize="xs" color="fg.muted">
                    {formatDate(ticket.createdAt)}
                  </Text>
                </HStack>
              ))}
              {activity.recentTickets.length === 0 && (
                <Text color="fg.muted" textAlign="center">
                  Нет обращений
                </Text>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>
      </Grid>
    </>
  )
}

// Вспомогательные функции
function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - new Date(date).getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return 'Сегодня'
  }
  if (days === 1) {
    return 'Вчера'
  }
  if (days < 7) {
    return `${days} дн. назад`
  }
  return new Date(date).toLocaleDateString('ru-RU')
}

function getTicketStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    NEW: 'Новое',
    IN_PROGRESS: 'В работе',
    RESOLVED: 'Решено',
    CLOSED: 'Закрыто',
  }
  return labels[status] || status
}
