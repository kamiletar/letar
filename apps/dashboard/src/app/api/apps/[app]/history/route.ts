import { formatMetricsForChart, getMetricsHistory } from '@/lib/metrics-history'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ app: string }> }) {
  try {
    const { app: appName } = await params
    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '24', 10)

    const points = await getMetricsHistory(appName, hours)
    const formatted = formatMetricsForChart(points)

    return NextResponse.json({
      appName,
      hours,
      pointsCount: points.length,
      ...formatted,
    })
  } catch (error) {
    console.error('Error fetching metrics history:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics history' }, { status: 500 })
  }
}
