import { checkSslCertificates } from '@/lib/ssl-monitor'
import { verifyCronSecret } from '@letar/api-server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/ssl-check
 *
 * Проверяет сроки действия всех сертификатов в Nginx Proxy Manager, при истечении/скором
 * истечении создаёт алерт `SSL_EXPIRING` с уведомлением в Telegram — см. lib/ssl-monitor.ts.
 * Вызывается dashboard-agent по расписанию (job `s2-ssl-check`).
 * curl -X POST -H "X-Cron-Secret: $CRON_SECRET" https://dash.letar.best/api/cron/ssl-check
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await checkSslCertificates()

  return NextResponse.json({ ok: !result.error, ...result })
}
