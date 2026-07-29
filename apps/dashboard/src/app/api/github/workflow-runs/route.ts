/**
 * API: GET /api/github/workflow-runs
 * Последние запуски GitHub Actions CI для монорепо letar.
 */

import { getServerSession } from '@/lib/auth'
import { fetchWorkflowRuns } from '@/lib/github-actions'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const data = await fetchWorkflowRuns(10)
    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GitHub Actions] workflow-runs error:', error)
    return NextResponse.json({ error: 'Не удалось получить статус CI' }, { status: 502 })
  }
}
