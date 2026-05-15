import { calculateGrowthStats, formatStorageForChart, getStorageHistory } from '@/lib/storage-history'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ app: string }> }) {
  try {
    const { app: appName } = await params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)

    const points = await getStorageHistory(appName, days)
    const formatted = formatStorageForChart(points)
    const stats = calculateGrowthStats(points)

    return NextResponse.json({
      appName,
      days,
      pointsCount: points.length,
      stats,
      ...formatted,
    })
  } catch (error) {
    console.error('Error fetching storage history:', error)
    return NextResponse.json({ error: 'Failed to fetch storage history' }, { status: 500 })
  }
}
