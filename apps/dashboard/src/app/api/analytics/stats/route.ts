/**
 * API: GET /api/analytics/stats
 * Получение статистики сайта из Umami
 *
 * Query params:
 *   websiteId — ID сайта в Umami (обязательный)
 *   period — период: 1h, 24h, 7d, 30d (по умолчанию 24h)
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const UMAMI_API_URL = process.env.UMAMI_API_URL || 'https://stats.letar.best'
const UMAMI_API_USER = process.env.UMAMI_API_USER || 'admin'
const UMAMI_API_PASSWORD = process.env.UMAMI_API_PASSWORD || ''

/** Получить токен авторизации Umami */
async function getUmamiToken(): Promise<string> {
  const res = await fetch(`${UMAMI_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: UMAMI_API_USER,
      password: UMAMI_API_PASSWORD,
    }),
  })

  if (!res.ok) {
    throw new Error(`Umami auth failed: ${res.status}`)
  }

  const data = await res.json()
  return data.token
}

/** Вычислить startAt/endAt по периоду */
function getPeriodRange(period: string): { startAt: number; endAt: number } {
  const now = Date.now()
  const periods: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  }
  const ms = periods[period] || periods['24h']
  return { startAt: now - ms, endAt: now }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const websiteId = searchParams.get('websiteId')
  const period = searchParams.get('period') || '24h'

  if (!websiteId) {
    return NextResponse.json({ error: 'Параметр websiteId обязателен' }, { status: 400 })
  }

  try {
    const token = await getUmamiToken()
    const { startAt, endAt } = getPeriodRange(period)

    const res = await fetch(`${UMAMI_API_URL}/api/websites/${websiteId}/stats?startAt=${startAt}&endAt=${endAt}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      throw new Error(`Umami API error: ${res.status}`)
    }

    const stats = await res.json()
    return NextResponse.json({ data: stats })
  } catch (error) {
    console.error('[Analytics] Ошибка получения статистики:', error)
    return NextResponse.json({ error: 'Не удалось получить статистику' }, { status: 502 })
  }
}
