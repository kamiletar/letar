'use server'

import type { AdminDashboardStats } from '@/app/_types/admin-dashboard.types'
import type { SessionStatus, TransformationStage } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

/**
 * ВАЛИДАЦИЯ ДОСТУПА ДЛЯ АДМИНИСТРАТОРОВ
 * Проверяет аутентификацию и роль ADMIN
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
 * Возвращает полную статистику системы для дашборда админа
 */
export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const { db } = await validateAdminAccess()

  try {
    // === ПОЛЬЗОВАТЕЛИ ===
    const [totalUsers, usersByRole, recentUsers] = await Promise.all([
      // Всего пользователей
      db.user.count(),

      // Пользователи по ролям
      db.user.groupBy({
        by: ['role'],
        _count: {
          role: true,
        },
      }),

      // Недавние пользователи (последние 5)
      db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
    ])

    const clients = usersByRole.find((r) => r.role === 'CLIENT')?._count.role || 0
    const specialists = usersByRole.find((r) => r.role === 'SPECIALIST')?._count.role || 0
    const admins = usersByRole.find((r) => r.role === 'ADMIN')?._count.role || 0

    // === КЛИЕНТЫ ===
    const [totalClients, clientsWithProfiles] = await Promise.all([
      // Всего записей клиентов
      db.client.count(),

      // Клиенты с профилями
      db.client.findMany({
        select: {
          numerologyProfile: {
            select: { id: true },
          },
          neuroPsychProfile: {
            select: { id: true },
          },
          energyProfile: {
            select: { id: true },
          },
          bodyProfile: {
            select: { id: true },
          },
          styleProfile: {
            select: { id: true },
          },
        },
      }),
    ])

    const withProfiles = {
      numerology: clientsWithProfiles.filter((c) => c.numerologyProfile).length,
      neuroPsych: clientsWithProfiles.filter((c) => c.neuroPsychProfile).length,
      energy: clientsWithProfiles.filter((c) => c.energyProfile).length,
      body: clientsWithProfiles.filter((c) => c.bodyProfile).length,
      style: clientsWithProfiles.filter((c) => c.styleProfile).length,
    }

    const totalProfilesCount =
      withProfiles.numerology + withProfiles.neuroPsych + withProfiles.energy + withProfiles.body + withProfiles.style

    const averageProfilesPerClient = totalClients > 0 ? totalProfilesCount / totalClients : 0

    // === СЕССИИ ===
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())

    const [totalSessions, sessionsByStatus, sessionsThisMonth, sessionsThisWeek] = await Promise.all([
      // Всего сессий
      db.therapySession.count(),

      // Сессии по статусам
      db.therapySession.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),

      // Сессии за текущий месяц
      db.therapySession.count({
        where: {
          scheduledAt: {
            gte: startOfMonth,
          },
        },
      }),

      // Сессии за текущую неделю
      db.therapySession.count({
        where: {
          scheduledAt: {
            gte: startOfWeek,
          },
        },
      }),
    ])

    const byStatus = sessionsByStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count.status
        return acc
      },
      {} as Record<SessionStatus, number>
    )

    // === ПЛАНЫ ТРАНСФОРМАЦИИ ===
    const [totalPlans, activePlans, completedPlans, plansByStage] = await Promise.all([
      // Всего планов
      db.transformationPlan.count(),

      // Активные планы
      db.transformationPlan.count({
        where: { isActive: true },
      }),

      // Завершенные планы
      db.transformationPlan.count({
        where: { isCompleted: true },
      }),

      // Планы по этапам
      db.transformationPlan.groupBy({
        by: ['currentStage'],
        _count: {
          currentStage: true,
        },
      }),
    ])

    const plansByStageRecord = plansByStage.reduce(
      (acc, item) => {
        acc[item.currentStage] = item._count.currentStage
        return acc
      },
      {} as Record<TransformationStage, number>
    )

    // === ПРАКТИКИ ===
    const [totalPractices, completedPractices] = await Promise.all([
      // Всего практик
      db.practice.count(),

      // Завершенные практики
      db.practice.count({
        where: { isCompleted: true },
      }),
    ])

    const practiceCompletionRate = totalPractices > 0 ? (completedPractices / totalPractices) * 100 : 0

    // === АКТИВНОСТЬ СПЕЦИАЛИСТОВ ===
    const specialistUsers = await db.user.findMany({
      where: { role: 'SPECIALIST' },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    const specialistActivity = await Promise.all(
      specialistUsers.map(async (specialist) => {
        const [clientCount, sessionCount, planCount] = await Promise.all([
          db.client.count({
            where: { specialistId: specialist.id },
          }),
          db.therapySession.count({
            where: {
              client: {
                specialistId: specialist.id,
              },
            },
          }),
          db.transformationPlan.count({
            where: {
              client: {
                specialistId: specialist.id,
              },
            },
          }),
        ])

        return {
          id: specialist.id,
          name: specialist.name,
          email: specialist.email,
          clientCount,
          sessionCount,
          planCount,
        }
      })
    )

    // Сортируем по количеству клиентов (по убыванию)
    specialistActivity.sort((a, b) => b.clientCount - a.clientCount)

    // === ВОЗВРАЩАЕМ СТАТИСТИКУ ===
    return {
      users: {
        total: totalUsers,
        clients,
        specialists,
        admins,
        recentUsers,
      },
      clients: {
        total: totalClients,
        withProfiles,
        averageProfilesPerClient: Math.round(averageProfilesPerClient * 10) / 10,
      },
      sessions: {
        total: totalSessions,
        byStatus,
        thisMonth: sessionsThisMonth,
        thisWeek: sessionsThisWeek,
      },
      plans: {
        total: totalPlans,
        active: activePlans,
        completed: completedPlans,
        byStage: plansByStageRecord,
      },
      practices: {
        total: totalPractices,
        completed: completedPractices,
        completionRate: Math.round(practiceCompletionRate * 10) / 10,
      },
      specialistActivity,
    }
  } catch (error) {
    console.error('Failed to get admin dashboard stats:', error)
    throw new Error('Не удалось загрузить статистику', { cause: error })
  }
}
