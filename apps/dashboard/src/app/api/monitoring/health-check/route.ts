import { NextResponse } from 'next/server'

import { getAllAppMetrics, performAllHealthChecks } from '@/lib/app-metrics'

export const dynamic = 'force-dynamic'

/**
 * GET /api/monitoring/health-check
 * Возвращает текущие метрики всех приложений
 */
export async function GET() {
  const metrics = getAllAppMetrics()
  return NextResponse.json({ metrics })
}

/**
 * POST /api/monitoring/health-check
 * Выполняет health-check для всех приложений
 */
export async function POST() {
  const results = await performAllHealthChecks()
  const metrics = getAllAppMetrics()

  return NextResponse.json({
    results,
    metrics,
  })
}
