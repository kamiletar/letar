import { updatePageViewCounts } from '@/lib/pageview-counter'
import { verifyCronSecret } from '@letar/api-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/pageview-count
 *
 * Инкрементально парсит access-логи Nginx Proxy Manager и обновляет PageViewCount(date, domain) —
 * см. lib/pageview-counter.ts. Вызывается dashboard-agent по расписанию (job `s2-pageview-count`).
 * curl -X POST -H "X-Cron-Secret: $CRON_SECRET" https://dash.letar.best/api/cron/pageview-count
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await updatePageViewCounts()

  return NextResponse.json({ ok: result.errors.length === 0, ...result })
}
