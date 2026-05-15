'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

/**
 * Параметры запроса логов
 */
interface GetApiLogsParams {
  schoolId: string
  page?: number
  limit?: number
  apiKeyId?: string
  endpoint?: string
  statusCode?: number
  dateFrom?: string
  dateTo?: string
}

/**
 * Статистика по логам
 */
interface ApiLogsStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  requestsByEndpoint: { endpoint: string; count: number }[]
  requestsByDay: { date: string; count: number }[]
}

/**
 * Получает логи API для школы
 * Доступно только ADMIN школы
 */
export async function getApiLogsAction(params: GetApiLogsParams) {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Не авторизован' }
  }

  const { schoolId, page = 1, limit = 50, apiKeyId, endpoint, statusCode, dateFrom, dateTo } = params

  const db = getEnhancedPrisma(session.user)
  // Проверяем, что пользователь - ADMIN школы
  const membership = await db.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: schoolId,
        userId: session.user.id,
      },
    },
  })

  if (!membership || !['owner', 'super_manager', 'manager'].includes(membership.role)) {
    return { success: false, error: 'Только администратор школы может просматривать логи API' }
  }

  try {
    // Формируем условия фильтрации
    const where = {
      schoolId,
      ...(apiKeyId && { apiKeyId }),
      ...(endpoint && { endpoint: { contains: endpoint } }),
      ...(statusCode && { statusCode }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo) }),
            },
          }
        : {}),
    }

    // Получаем общее количество
    const total = await db.apiLog.count({ where })

    // Получаем логи с пагинацией
    const logs = await db.apiLog.findMany({
      where,
      include: {
        apiKey: {
          select: {
            id: true,
            name: true,
            keyPrefix: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return {
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    }
  } catch (error) {
    console.error('Ошибка получения логов API:', error)
    return { success: false, error: 'Ошибка получения логов' }
  }
}

/**
 * Получает статистику логов API для школы
 */
export async function getApiLogsStatsAction(
  schoolId: string,
  dateFrom?: string,
  dateTo?: string
): Promise<{ success: boolean; data?: ApiLogsStats; error?: string }> {
  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Не авторизован' }
  }

  const db = getEnhancedPrisma(session.user)
  // Проверяем доступ
  const membership = await db.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: schoolId,
        userId: session.user.id,
      },
    },
  })

  if (!membership || !['owner', 'super_manager', 'manager'].includes(membership.role)) {
    return { success: false, error: 'Только администратор школы может просматривать статистику API' }
  }

  try {
    // Период по умолчанию - последние 30 дней
    const defaultDateFrom = new Date()
    defaultDateFrom.setDate(defaultDateFrom.getDate() - 30)

    const dateFilter = {
      createdAt: {
        gte: dateFrom ? new Date(dateFrom) : defaultDateFrom,
        ...(dateTo && { lte: new Date(dateTo) }),
      },
    }

    const where = { schoolId, ...dateFilter }

    // Параллельно получаем статистику
    const [totalRequests, successfulRequests, averageResponseTimeResult, requestsByEndpoint, requestsByDay] =
      await Promise.all([
        // Всего запросов
        db.apiLog.count({ where }),

        // Успешных запросов (2xx)
        db.apiLog.count({
          where: {
            ...where,
            statusCode: { gte: 200, lt: 300 },
          },
        }),

        // Среднее время ответа
        db.apiLog.aggregate({
          where,
          _avg: { responseTimeMs: true },
        }),

        // Запросы по эндпоинтам
        db.apiLog.groupBy({
          by: ['endpoint'],
          where,
          _count: { endpoint: true },
          orderBy: { _count: { endpoint: 'desc' } },
          take: 10,
        }),

        // Запросы по дням
        db.$queryRaw<{ date: Date; count: bigint }[]>`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM "ApiLog"
          WHERE school_id = ${schoolId}
            AND created_at >= ${dateFrom ? new Date(dateFrom) : defaultDateFrom}
            ${dateTo ? db.$queryRaw`AND created_at <= ${new Date(dateTo)}` : db.$queryRaw``}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
          LIMIT 30
        `.catch(() => []),
      ])

    return {
      success: true,
      data: {
        totalRequests,
        successfulRequests,
        failedRequests: totalRequests - successfulRequests,
        averageResponseTime: Math.round(averageResponseTimeResult._avg.responseTimeMs ?? 0),
        requestsByEndpoint: requestsByEndpoint.map((r) => ({
          endpoint: r.endpoint,
          count: r._count.endpoint,
        })),
        requestsByDay: requestsByDay.map((r) => ({
          date: r.date.toISOString().split('T')[0],
          count: Number(r.count),
        })),
      },
    }
  } catch (error) {
    console.error('Ошибка получения статистики логов API:', error)
    return { success: false, error: 'Ошибка получения статистики' }
  }
}
