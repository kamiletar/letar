import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

/**
 * GET /api/owner/api-logs
 * Возвращает все логи API (только для OWNER)
 *
 * Query параметры:
 * - page: номер страницы (по умолчанию 1)
 * - limit: количество записей на страницу (по умолчанию 50, макс 100)
 * - organizationId: фильтр по ID организации
 * - apiKeyId: фильтр по ID API-ключа
 * - endpoint: фильтр по эндпоинту (частичное совпадение)
 * - statusCode: фильтр по HTTP статусу
 * - dateFrom: начало периода (ISO 8601)
 * - dateTo: конец периода (ISO 8601)
 */
export async function GET(request: Request) {
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  // Проверяем роль OWNER
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true },
  })

  if (!user?.roles.includes('OWNER')) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const organizationId = searchParams.get('organizationId')
    const apiKeyId = searchParams.get('apiKeyId')
    const endpoint = searchParams.get('endpoint')
    const statusCodeStr = searchParams.get('statusCode')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Формируем условия фильтрации
    const where = {
      ...(organizationId && { organizationId }),
      ...(apiKeyId && { apiKeyId }),
      ...(endpoint && { endpoint: { contains: endpoint } }),
      ...(statusCodeStr && { statusCode: parseInt(statusCodeStr, 10) }),
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
    const total = await prisma.apiLog.count({ where })

    // Получаем логи с пагинацией
    const logs = await prisma.apiLog.findMany({
      where,
      include: {
        apiKey: {
          select: {
            id: true,
            name: true,
            keyPrefix: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Ошибка получения логов API:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}

/**
 * DELETE /api/owner/api-logs
 * Удаляет старые логи (ротация)
 *
 * Body:
 * - olderThanDays: удалить логи старше N дней (по умолчанию 30)
 */
export async function DELETE(request: Request) {
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
  }

  // Проверяем роль OWNER
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { roles: true },
  })

  if (!user?.roles.includes('OWNER')) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const olderThanDays = body.olderThanDays ?? 30

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const result = await prisma.apiLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    })

    return NextResponse.json({
      success: true,
      deleted: result.count,
      olderThanDays,
      cutoffDate: cutoffDate.toISOString(),
    })
  } catch (error) {
    console.error('Ошибка ротации логов API:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
