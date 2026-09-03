/**
 * GET /api/jobs/status
 *
 * Снимок состояния крон-задач приложения (@letar/jobs, PLAN-INFRA-4.md §75). Опрашивается
 * dashboard-agent в режиме наблюдателя — алертит, если задача давно не отрабатывала успешно.
 * Read-only, не запускает задачи (для этого — runNow через админку `/jobs`).
 *
 * curl -H "X-Cron-Secret: $CRON_SECRET" https://dash.letar.best/api/jobs/status
 */
import { getDashboardJobStatuses } from '@/jobs/scheduler'
import { verifyCronSecret } from '@letar/api-server'
import { type NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const statuses = await getDashboardJobStatuses()

  return Response.json({ ok: true, jobs: statuses })
}
