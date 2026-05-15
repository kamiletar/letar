'use server'

import type { SpecialistStats } from '@/app/(specialist)/_types/analytics.types'
import type { SessionStatus, TransformationStage } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

/**
 * ВАЛИДАЦИЯ ДОСТУПА ДЛЯ СПЕЦИАЛИСТОВ
 * Проверяет аутентификацию и роль пользователя
 */
async function validateSpecialistAccess() {
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  if (session.user.role !== 'SPECIALIST' && session.user.role !== 'ADMIN') {
    throw new Error('Forbidden: Specialist or Admin access required')
  }

  return { session, db: getEnhancedPrisma(session.user) }
}

/**
 * ПОЛУЧИТЬ СТАТИСТИКУ СПЕЦИАЛИСТА
 * Возвращает полную аналитику для дашборда
 */
export async function getSpecialistStats(): Promise<SpecialistStats> {
  const { session, db } = await validateSpecialistAccess()

  // Параллельное получение всех данных
  const [totalClients, clients, sessions, plans, recentClients, upcomingSessions] = await Promise.all([
    // 1. Общее количество клиентов
    db.client.count({
      where: { specialistId: session.user.id },
    }),

    // 2. Все клиенты для анализа активности
    db.client.findMany({
      where: { specialistId: session.user.id },
      include: {
        transformationPlans: {
          select: {
            id: true,
            currentStage: true,
          },
        },
      },
    }),

    // 3. Все сессии для статистики
    db.therapySession.findMany({
      where: {
        client: {
          specialistId: session.user.id,
        },
      },
      select: {
        status: true,
      },
    }),

    // 4. Все планы для статистики
    db.transformationPlan.findMany({
      where: {
        client: {
          specialistId: session.user.id,
        },
      },
      select: {
        currentStage: true,
      },
    }),

    // 5. Недавние клиенты (последние 5)
    db.client.findMany({
      where: { specialistId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
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

    // 6. Предстоящие сессии (следующие 5)
    db.therapySession.findMany({
      where: {
        client: {
          specialistId: session.user.id,
        },
        scheduledAt: {
          gte: new Date(), // Только будущие сессии
        },
        status: {
          in: ['SCHEDULED', 'IN_PROGRESS'],
        },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 5,
      select: {
        id: true,
        scheduledAt: true,
        duration: true,
        status: true,
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ])

  // Подсчет активных клиентов (с незавершенными планами)
  const activeClients = clients.filter((client) =>
    client.transformationPlans.some((plan) => plan.currentStage !== 'RESULT')
  ).length

  // Подсчет сессий по статусам
  const sessionsByStatus = sessions.reduce(
    (acc, session) => {
      acc[session.status] = (acc[session.status] || 0) + 1
      return acc
    },
    {} as Record<SessionStatus, number>
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

  return {
    // Общая статистика
    totalClients,
    activeClients,
    inactiveClients: totalClients - activeClients,

    // Статистика сессий
    totalSessions: sessions.length,
    scheduledSessions: sessionsByStatus['SCHEDULED'] || 0,
    inProgressSessions: sessionsByStatus['IN_PROGRESS'] || 0,
    completedSessions: sessionsByStatus['COMPLETED'] || 0,
    cancelledSessions: sessionsByStatus['CANCELLED'] || 0,

    // Статистика планов
    totalPlans: plans.length,
    plansByStage,

    // Недавние клиенты
    recentClients: recentClients.map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      createdAt: client.createdAt,
      hasNumerology: !!client.numerologyProfile,
      hasNeuroPsych: !!client.neuroPsychProfile,
      hasEnergy: !!client.energyProfile,
      hasBody: !!client.bodyProfile,
      hasStyle: !!client.styleProfile,
    })),

    // Предстоящие сессии
    upcomingSessions,
  }
}
