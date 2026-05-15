'use server'

/**
 * Server Actions для системы алертов dashboard
 *
 * @module alerts-action
 */

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

export type AlertType = 'error' | 'warning' | 'info'

export interface DashboardAlert {
  id: string
  type: AlertType
  title: string
  description: string
  count: number
  href?: string
}

interface AlertsResult {
  alerts: DashboardAlert[]
  totalCount: number
}

/**
 * Получение алертов для инструктора
 */
export async function getInstructorAlerts(): Promise<AlertsResult> {
  const session = await getSession()
  if (!session?.user) {
    return { alerts: [], totalCount: 0 }
  }

  const instructorProfile = await prisma.instructorProfile.findUnique({
    where: { userId: session.user.id },
  })

  if (!instructorProfile) {
    return { alerts: [], totalCount: 0 }
  }

  const alerts: DashboardAlert[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Параллельные запросы для производительности
  const [pendingLessons, cancelledToday, noShowsThisWeek, studentsWithDebt] = await Promise.all([
    // 1. Ожидающие подтверждения занятия
    prisma.lesson.count({
      where: {
        instructorId: session.user.id,
        status: 'PENDING',
      },
    }),

    // 2. Отмены сегодня
    prisma.lesson.count({
      where: {
        instructorId: session.user.id,
        status: 'CANCELLED',
        slot: {
          startTime: {
            gte: today,
            lt: tomorrow,
          },
        },
      },
    }),

    // 3. Неявки за неделю
    prisma.lesson.count({
      where: {
        instructorId: session.user.id,
        status: 'NO_SHOW',
        slot: {
          startTime: {
            gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
    }),

    // 4. Ученики с отрицательным балансом (должники)
    prisma.studentInstructorConnection.count({
      where: {
        instructorId: instructorProfile.id,
        status: 'ACTIVE',
        prepaidLessons: { lt: 0 },
      },
    }),
  ])

  // Формируем алерты по приоритету
  if (studentsWithDebt > 0) {
    alerts.push({
      id: 'debt',
      type: 'error',
      title: 'Ученики с долгом',
      description: 'Ученики с отрицательным балансом',
      count: studentsWithDebt,
      href: '/students?filter=debt',
    })
  }

  if (pendingLessons > 0) {
    alerts.push({
      id: 'pending',
      type: 'warning',
      title: 'Ожидают подтверждения',
      description: 'Занятия требуют вашего подтверждения',
      count: pendingLessons,
      href: '/lessons?status=PENDING',
    })
  }

  if (cancelledToday > 0) {
    alerts.push({
      id: 'cancelled',
      type: 'warning',
      title: 'Отмены сегодня',
      description: 'Занятия отменены на сегодня',
      count: cancelledToday,
      href: '/lessons?status=CANCELLED',
    })
  }

  if (noShowsThisWeek > 0) {
    alerts.push({
      id: 'noshow',
      type: 'info',
      title: 'Неявки за неделю',
      description: 'Ученики не явились на занятия',
      count: noShowsThisWeek,
      href: '/lessons?status=NO_SHOW',
    })
  }

  return {
    alerts,
    totalCount: alerts.reduce((sum, a) => sum + a.count, 0),
  }
}

/**
 * Получение алертов для администратора школы
 */
export async function getSchoolAdminAlerts(): Promise<AlertsResult> {
  const session = await getSession()
  if (!session?.user) {
    return { alerts: [], totalCount: 0 }
  }

  // Проверяем членство в организации
  const membership = await prisma.member.findFirst({
    where: {
      userId: session.user.id,
      role: { in: ['owner', 'super_manager', 'manager'] },
    },
    include: { organization: true },
  })

  if (!membership) {
    return { alerts: [], totalCount: 0 }
  }

  const alerts: DashboardAlert[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Алерты для школы
  const [pendingExams] = await Promise.all([
    // Ожидающие экзамены
    prisma.examSession.count({
      where: {
        organizationId: membership.organizationId,
        scheduledAt: { gte: today },
        status: 'SCHEDULED',
      },
    }),
  ])

  // Считаем открытые тикеты (тикеты от членов организации)
  const organizationMembers = await prisma.member.findMany({
    where: { organizationId: membership.organizationId },
    select: { userId: true },
  })
  const memberUserIds = organizationMembers.map((m) => m.userId)

  const openTickets = await prisma.supportTicket.count({
    where: {
      authorId: { in: memberUserIds },
      status: 'OPEN',
    },
  })

  if (openTickets > 0) {
    alerts.push({
      id: 'tickets',
      type: 'warning',
      title: 'Открытые обращения',
      description: 'Тикеты требуют ответа',
      count: openTickets,
      href: '/school/tickets',
    })
  }

  if (pendingExams > 0) {
    alerts.push({
      id: 'exams',
      type: 'info',
      title: 'Предстоящие экзамены',
      description: 'Экзамены в ближайшее время',
      count: pendingExams,
      href: '/school/exams',
    })
  }

  return {
    alerts,
    totalCount: alerts.reduce((sum, a) => sum + a.count, 0),
  }
}

/**
 * Получение алертов для владельца платформы
 */
export async function getOwnerAlerts(): Promise<AlertsResult> {
  const session = await getSession()
  if (!session?.user || !session.user.roles?.includes('OWNER')) {
    return { alerts: [], totalCount: 0 }
  }

  const alerts: DashboardAlert[] = []

  const [openTickets, unpublishedSchools] = await Promise.all([
    // Все открытые тикеты поддержки (для владельца — все тикеты платформы)
    prisma.supportTicket.count({
      where: {
        status: 'OPEN',
      },
    }),

    // Непубличные школы (потенциально ожидают проверки)
    prisma.organization.count({
      where: {
        isPublic: false,
      },
    }),
  ])

  if (openTickets > 0) {
    alerts.push({
      id: 'platform-tickets',
      type: 'error',
      title: 'Открытые обращения',
      description: 'Требуют ответа',
      count: openTickets,
      href: '/owner/tickets',
    })
  }

  if (unpublishedSchools > 0) {
    alerts.push({
      id: 'unpublished-schools',
      type: 'info',
      title: 'Непубличные школы',
      description: 'Не видны в поиске',
      count: unpublishedSchools,
      href: '/owner/schools',
    })
  }

  return {
    alerts,
    totalCount: alerts.reduce((sum, a) => sum + a.count, 0),
  }
}
