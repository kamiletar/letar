'use server'

import type { ClientDashboardStats, LevelProgressHistory } from '@/app/_types/client-dashboard.types'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

/**
 * ВАЛИДАЦИЯ ДОСТУПА ДЛЯ КЛИЕНТА
 * Проверяет аутентификацию и роль CLIENT
 */
async function validateClientAccess() {
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  if (session.user.role !== 'CLIENT') {
    throw new Error('Forbidden: Client access required')
  }

  return { session, db: getEnhancedPrisma(session.user) }
}

/**
 * Server Action для получения статистики дашборда клиента
 */
export async function getClientDashboardStats(): Promise<ClientDashboardStats> {
  const { session, db } = await validateClientAccess()

  try {
    // Получаем клиента по userId
    const client = await db.client.findFirst({
      where: {
        userId: session.user.id,
      },
    })

    if (!client) {
      // Если у пользователя нет профиля клиента, возвращаем пустую статистику
      return {
        sessions: {
          total: 0,
          completed: 0,
          upcoming: 0,
          nextSession: null,
        },
        activePlan: null,
        practices: {
          total: 0,
          completed: 0,
          active: 0,
          completionRate: 0,
        },
        results: {
          total: 0,
          recentCount: 0,
          byLevel: {
            numerology: 0,
            neuroPsych: 0,
            energy: 0,
            body: 0,
            style: 0,
          },
        },
        levelProgress: [],
      }
    }

    // === СЕССИИ ===
    const [totalSessions, completedSessions, upcomingSessions, nextSession] = await Promise.all([
      // Всего сессий
      db.therapySession.count({
        where: { clientId: client.id },
      }),
      // Завершенные сессии
      db.therapySession.count({
        where: {
          clientId: client.id,
          status: 'COMPLETED',
        },
      }),
      // Предстоящие сессии
      db.therapySession.count({
        where: {
          clientId: client.id,
          status: {
            in: ['SCHEDULED', 'IN_PROGRESS'],
          },
        },
      }),
      // Следующая сессия
      db.therapySession.findFirst({
        where: {
          clientId: client.id,
          status: 'SCHEDULED',
          scheduledAt: {
            gte: new Date(),
          },
        },
        orderBy: {
          scheduledAt: 'asc',
        },
        select: {
          id: true,
          scheduledAt: true,
          duration: true,
          notes: true,
        },
      }),
    ])

    // === АКТИВНЫЙ ПЛАН ===
    const activePlan = await db.transformationPlan.findFirst({
      where: {
        clientId: client.id,
        isActive: true,
      },
      orderBy: {
        startDate: 'desc',
      },
      select: {
        id: true,
        currentStage: true,
        startDate: true,
        expectedEndDate: true,
        diagnosticsDescription: true,
        integrationDescription: true,
        strategyDescription: true,
        practiceDescription: true,
        expectedResults: true,
      },
    })

    // Рассчитываем прогресс плана на основе текущего этапа
    const stageProgress: Record<string, number> = {
      DIAGNOSTICS: 20,
      INTEGRATION: 40,
      STRATEGY: 60,
      PRACTICE: 80,
      RESULT: 100,
    }

    // === ПРАКТИКИ ===
    const [totalPractices, completedPractices] = await Promise.all([
      // Всего практик
      db.practice.count({
        where: {
          clientId: client.id,
        },
      }),
      // Завершенные практики
      db.practice.count({
        where: {
          clientId: client.id,
          isCompleted: true,
        },
      }),
    ])

    const activePractices = totalPractices - completedPractices
    const completionRate = totalPractices > 0 ? (completedPractices / totalPractices) * 100 : 0

    // === РЕЗУЛЬТАТЫ ===
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [totalResults, recentResults, resultsByLevel] = await Promise.all([
      // Всего результатов
      db.result.count({
        where: { clientId: client.id },
      }),
      // Результаты за последние 30 дней
      db.result.count({
        where: {
          clientId: client.id,
          measuredAt: {
            gte: thirtyDaysAgo,
          },
        },
      }),
      // Результаты по уровням
      db.result.groupBy({
        by: ['level'],
        where: { clientId: client.id },
        _count: {
          level: true,
        },
      }),
    ])

    // Форматируем результаты по уровням
    const byLevel = {
      numerology: resultsByLevel.find((r) => r.level === 'numerology')?._count.level || 0,
      neuroPsych: resultsByLevel.find((r) => r.level === 'neuroPsych')?._count.level || 0,
      energy: resultsByLevel.find((r) => r.level === 'energy')?._count.level || 0,
      body: resultsByLevel.find((r) => r.level === 'body')?._count.level || 0,
      style: resultsByLevel.find((r) => r.level === 'style')?._count.level || 0,
    }

    // === ПРОГРЕСС ПО УРОВНЯМ ===
    // Получаем последние результаты для каждого уровня/метрики
    const latestResults = await db.result.findMany({
      where: { clientId: client.id },
      orderBy: {
        measuredAt: 'desc',
      },
      take: 50, // Берем последние 50 результатов для анализа
    })

    // Группируем по level+metric и берем последние 2 значения для каждой комбинации
    const levelProgressMap = new Map<
      string,
      { current: (typeof latestResults)[0]; previous: (typeof latestResults)[0] | null }
    >()

    latestResults.forEach((result) => {
      const key = `${result.level}:${result.metric}`
      const existing = levelProgressMap.get(key)

      if (!existing) {
        levelProgressMap.set(key, { current: result, previous: null })
      } else if (!existing.previous) {
        existing.previous = result
      }
    })

    // Преобразуем в массив с расчетом изменений
    const levelProgress = Array.from(levelProgressMap.values()).map(({ current, previous }) => {
      const change = previous ? ((current.value - previous.value) / previous.value) * 100 : 0

      let trend: 'up' | 'down' | 'stable' = 'stable'
      if (change > 5) {
        trend = 'up'
      } else if (change < -5) {
        trend = 'down'
      }

      return {
        level: current.level,
        metric: current.metric,
        currentValue: current.value,
        previousValue: previous?.value || null,
        change: Math.round(change * 10) / 10, // Округляем до 1 знака
        trend,
        measuredAt: current.measuredAt,
      }
    })

    // === ВОЗВРАЩАЕМ СТАТИСТИКУ ===
    return {
      sessions: {
        total: totalSessions,
        completed: completedSessions,
        upcoming: upcomingSessions,
        nextSession: nextSession
          ? {
              id: nextSession.id,
              date: nextSession.scheduledAt,
              duration: nextSession.duration,
              notes: nextSession.notes,
            }
          : null,
      },
      activePlan: activePlan
        ? {
            id: activePlan.id,
            title: 'План трансформации', // Заголовок по умолчанию
            currentStage: activePlan.currentStage,
            startDate: activePlan.startDate,
            targetDate: activePlan.expectedEndDate,
            progress: stageProgress[activePlan.currentStage] || 0,
          }
        : null,
      practices: {
        total: totalPractices,
        completed: completedPractices,
        active: activePractices,
        completionRate: Math.round(completionRate * 10) / 10,
      },
      results: {
        total: totalResults,
        recentCount: recentResults,
        byLevel,
      },
      levelProgress,
    }
  } catch (error) {
    console.error('Failed to get client dashboard stats:', error)
    throw new Error('Не удалось загрузить статистику', { cause: error })
  }
}

/**
 * Server Action для получения истории прогресса по уровням
 * Используется для построения графиков
 */
export async function getLevelProgressHistory(
  level?: string,
  metric?: string,
  days = 90
): Promise<LevelProgressHistory[]> {
  const { session, db } = await validateClientAccess()

  try {
    // Получаем клиента
    const client = await db.client.findFirst({
      where: { userId: session.user.id },
    })

    if (!client) {
      // Если у пользователя нет профиля клиента, возвращаем пустой массив
      return []
    }

    // Рассчитываем дату начала
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Получаем результаты с фильтрацией
    const results = await db.result.findMany({
      where: {
        clientId: client.id,
        measuredAt: {
          gte: startDate,
        },
        ...(level && { level }),
        ...(metric && { metric }),
      },
      orderBy: {
        measuredAt: 'asc',
      },
      select: {
        level: true,
        metric: true,
        value: true,
        measuredAt: true,
      },
    })

    // Группируем по level+metric
    const historyMap = new Map<string, LevelProgressHistory>()

    results.forEach((result) => {
      const key = `${result.level}:${result.metric}`

      if (!historyMap.has(key)) {
        historyMap.set(key, {
          level: result.level,
          metric: result.metric,
          data: [],
        })
      }

      historyMap.get(key)!.data.push({
        date: result.measuredAt,
        value: result.value,
      })
    })

    return Array.from(historyMap.values())
  } catch (error) {
    console.error('Failed to get level progress history:', error)
    throw new Error('Не удалось загрузить историю прогресса', { cause: error })
  }
}
