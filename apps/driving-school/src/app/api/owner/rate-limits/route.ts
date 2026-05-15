import { getSession } from '@/lib/auth'
import {
  addToBlacklist,
  addToWhitelist,
  getAllSettings,
  getCustomLimit,
  getRateLimiterStats,
  removeFromBlacklist,
  removeFromWhitelist,
  resetCounters,
  setCustomLimit,
} from '@letar/api-server'
import { NextResponse } from 'next/server'

// Проверка роли OWNER
async function checkOwnerAccess(): Promise<boolean> {
  const session = await getSession()
  return session?.user?.roles?.includes('OWNER') ?? false
}

/**
 * GET /api/owner/rate-limits
 * Получение текущих настроек rate limiting
 */
export async function GET() {
  if (!(await checkOwnerAccess())) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
  }

  const stats = getRateLimiterStats()
  const settings = getAllSettings()

  return NextResponse.json({
    stats,
    settings,
  })
}

/**
 * POST /api/owner/rate-limits
 * Управление настройками rate limiting
 */
export async function POST(request: Request) {
  if (!(await checkOwnerAccess())) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action, schoolId, limit } = body

    switch (action) {
      case 'setLimit':
        if (!schoolId || typeof limit !== 'number') {
          return NextResponse.json({ error: 'Требуется schoolId и limit' }, { status: 400 })
        }
        setCustomLimit(schoolId, limit)
        return NextResponse.json({ success: true, message: `Лимит для школы ${schoolId} установлен: ${limit}` })

      case 'removeLimit':
        if (!schoolId) {
          return NextResponse.json({ error: 'Требуется schoolId' }, { status: 400 })
        }
        setCustomLimit(schoolId, 0)
        return NextResponse.json({ success: true, message: `Кастомный лимит для школы ${schoolId} удалён` })

      case 'addToWhitelist':
        if (!schoolId) {
          return NextResponse.json({ error: 'Требуется schoolId' }, { status: 400 })
        }
        addToWhitelist(schoolId)
        return NextResponse.json({ success: true, message: `Школа ${schoolId} добавлена в whitelist` })

      case 'removeFromWhitelist':
        if (!schoolId) {
          return NextResponse.json({ error: 'Требуется schoolId' }, { status: 400 })
        }
        removeFromWhitelist(schoolId)
        return NextResponse.json({ success: true, message: `Школа ${schoolId} удалена из whitelist` })

      case 'addToBlacklist':
        if (!schoolId) {
          return NextResponse.json({ error: 'Требуется schoolId' }, { status: 400 })
        }
        addToBlacklist(schoolId)
        return NextResponse.json({ success: true, message: `Школа ${schoolId} добавлена в blacklist` })

      case 'removeFromBlacklist':
        if (!schoolId) {
          return NextResponse.json({ error: 'Требуется schoolId' }, { status: 400 })
        }
        removeFromBlacklist(schoolId)
        return NextResponse.json({ success: true, message: `Школа ${schoolId} удалена из blacklist` })

      case 'resetCounters':
        if (!schoolId) {
          return NextResponse.json({ error: 'Требуется schoolId' }, { status: 400 })
        }
        resetCounters(schoolId)
        return NextResponse.json({ success: true, message: `Счётчики для школы ${schoolId} сброшены` })

      case 'getLimit': {
        if (!schoolId) {
          return NextResponse.json({ error: 'Требуется schoolId' }, { status: 400 })
        }
        const currentLimit = getCustomLimit(schoolId)
        return NextResponse.json({ schoolId, limit: currentLimit })
      }

      default:
        return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 })
    }
  } catch (error) {
    console.error('Ошибка обработки запроса rate-limits:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
