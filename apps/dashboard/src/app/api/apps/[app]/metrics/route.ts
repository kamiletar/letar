import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getAppMetrics, getAvailableApps, performHealthCheck } from '@/lib/app-metrics'

export const dynamic = 'force-dynamic'

type Params = Promise<{ app: string }>

/**
 * GET /api/apps/[app]/metrics
 * Возвращает метрики приложения (response time, error rate)
 */
export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { app } = await params

  // Проверяем, существует ли приложение
  if (!getAvailableApps().includes(app)) {
    return NextResponse.json({ error: 'Приложение не найдено' }, { status: 404 })
  }

  const metrics = getAppMetrics(app)
  return NextResponse.json(metrics)
}

/**
 * POST /api/apps/[app]/metrics
 * Выполняет health-check для приложения
 */
export async function POST(request: NextRequest, { params }: { params: Params }) {
  const { app } = await params

  // Проверяем, существует ли приложение
  if (!getAvailableApps().includes(app)) {
    return NextResponse.json({ error: 'Приложение не найдено' }, { status: 404 })
  }

  const result = await performHealthCheck(app)
  const metrics = getAppMetrics(app)

  return NextResponse.json({
    result,
    metrics,
  })
}
