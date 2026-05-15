'use server'

import type { AdminStats } from '@/app/_types/admin-analytics.types'
import type { SessionStatus, TransformationStage, UserRole } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

/**
 * ВАЛИДАЦИЯ ДОСТУПА ДЛЯ АДМИНИСТРАТОРОВ
 */
async function validateAdminAccess() {
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  if (session.user.role !== 'ADMIN') {
    throw new Error('Forbidden: Admin access required')
  }

  return { session, db: getEnhancedPrisma(session.user) }
}

/**
 * ПОЛУЧИТЬ СТАТИСТИКУ АДМИНИСТРАТОРА
 * Возвращает полную аналитику по всей системе
 */
export async function getAdminStats(): Promise<AdminStats> {
  const { db } = await validateAdminAccess()

  // Параллельное получение всех данных
  const [users, clients, specialists, sessions, plans] = await Promise.all([
    // 1. Все пользователи
    db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),

    // 2. Все клиенты для анализа активности
    db.client.findMany({
      include: {
        transformationPlans: {
          select: {
            id: true,
            currentStage: true,
          },
        },
      },
    }),

    // 3. Все специалисты (пользователи с ролью SPECIALIST)
    db.user.findMany({
      where: {
        role: 'SPECIALIST',
      },
      select: {
        id: true,
        name: true,
        email: true,
        specialistClients: {
          select: {
            id: true,
          },
        },
        _count: {
          select: {
            specialistClients: true,
          },
        },
      },
    }),

    // 4. Все сессии для статистики
    db.therapySession.findMany({
      select: {
        status: true,
        clientId: true,
      },
    }),

    // 5. Все планы для статистики
    db.transformationPlan.findMany({
      select: {
        currentStage: true,
      },
    }),
  ])

  // Подсчет пользователей по ролям
  const usersByRole = users.reduce(
    (acc, user) => {
      const role = user.role.toLowerCase() as Lowercase<UserRole>
      acc[role] = (acc[role] || 0) + 1
      return acc
    },
    { client: 0, specialist: 0, admin: 0 } as Record<Lowercase<UserRole>, number>
  )

  // Подсчет активных клиентов (с незавершенными планами)
  const activeClients = clients.filter((client) =>
    client.transformationPlans.some((plan) => plan.currentStage !== 'RESULT')
  ).length

  // Подсчет активных специалистов (у которых есть клиенты)
  const activeSpecialists = specialists.filter((specialist) => specialist._count.specialistClients > 0).length

  // Подсчет сессий по статусам
  const sessionsByStatus = sessions.reduce(
    (acc, session) => {
      const status = session.status.toLowerCase() as Lowercase<SessionStatus>
      // Преобразуем IN_PROGRESS в inProgress
      const key = status.replace(/_/g, '') as keyof typeof acc
      acc[key] = (acc[key] || 0) + 1
      return acc
    },
    {
      scheduled: 0,
      inprogress: 0,
      completed: 0,
      cancelled: 0,
    }
  )

  // Подсчет планов по этапам
  const plansByStage = plans.reduce(
    (acc, plan) => {
      const stage = plan.currentStage.toLowerCase() as Lowercase<TransformationStage>
      acc[stage] = (acc[stage] || 0) + 1
      return acc
    },
    {
      diagnostics: 0,
      integration: 0,
      strategy: 0,
      practice: 0,
      result: 0,
    } as Record<Lowercase<TransformationStage>, number>
  )

  // Топ 5 специалистов по количеству клиентов
  const topSpecialistsData = specialists
    .map((specialist) => {
      // Подсчет сессий для каждого специалиста
      const clientIds = specialist.specialistClients.map((c) => c.id)
      const sessionCount = sessions.filter((s) => clientIds.includes(s.clientId)).length

      return {
        id: specialist.id,
        name: specialist.name || 'Без имени',
        email: specialist.email,
        clientCount: specialist._count.specialistClients,
        sessionCount,
      }
    })
    .sort((a, b) => b.clientCount - a.clientCount)
    .slice(0, 5)

  // Недавно зарегистрированные пользователи (последние 5)
  const recentUsers = users.slice(0, 5).map((user) => ({
    id: user.id,
    name: user.name || 'Без имени',
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  }))

  return {
    // Общая статистика пользователей
    totalUsers: users.length,
    usersByRole,

    // Статистика клиентов
    totalClients: clients.length,
    activeClients,

    // Статистика специалистов
    totalSpecialists: specialists.length,
    activeSpecialists,

    // Статистика сессий
    totalSessions: sessions.length,
    sessionsByStatus: {
      scheduled: sessionsByStatus.scheduled,
      inProgress: sessionsByStatus.inprogress,
      completed: sessionsByStatus.completed,
      cancelled: sessionsByStatus.cancelled,
    },

    // Статистика планов
    totalPlans: plans.length,
    plansByStage,

    // Топ специалистов
    topSpecialists: topSpecialistsData,

    // Недавние пользователи
    recentUsers,
  }
}
