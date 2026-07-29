/**
 * API: GET /api/analytics/pageviews
 * Грубый счётчик посещений (hits/day/domain) без ПДн — дополнение к Umami, см.
 * lib/pageview-counter.ts.
 */

import { getServerSession } from '@/lib/auth'
import { getPageViewsSummary } from '@/lib/pageview-counter'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await getPageViewsSummary()
    return NextResponse.json({ data })
  } catch (error) {
    console.error('[Analytics] pageviews error:', error)
    return NextResponse.json({ data: [] })
  }
}
