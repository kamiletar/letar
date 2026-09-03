/**
 * GET /api/jobs/status
 *
 * Снимок состояния крон-задач приложения (@letar/jobs, PLAN-INFRA §75). Опрашивается
 * dashboard-agent в режиме наблюдателя — алертит, если задача давно не отрабатывала успешно.
 * Read-only. У приложения нет админ/owner-панели (нет роли ADMIN вообще) — ручной запуск через
 * UI не заведён, задача полагается на автотик (см. PLAN_COMPLETED.md).
 *
 * curl -H "X-Cron-Secret: $CRON_SECRET" https://time.letar.best/api/jobs/status
 */
import { getTimeJobStatuses } from '@/jobs/scheduler'
import { verifyCronSecret } from '@letar/api-server'
import { type NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const statuses = await getTimeJobStatuses()

  return Response.json({ ok: true, jobs: statuses })
}
