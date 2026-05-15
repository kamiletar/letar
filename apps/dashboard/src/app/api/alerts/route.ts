import { getActiveAlerts, getAlerts } from '@/lib/alerts'
import { NextResponse } from 'next/server'

/**
 * GET /api/alerts
 * Возвращает список всех алертов
 *
 * Query параметры:
 * - active: boolean - только активные алерты
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    const alerts = activeOnly ? await getActiveAlerts() : await getAlerts()

    return NextResponse.json({
      success: true,
      count: alerts.length,
      alerts,
    })
  } catch (error) {
    console.error('Error in /api/alerts:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
