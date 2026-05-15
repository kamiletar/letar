/**
 * GET /api/admin/audit-pins/status — Статус фоновой задачи аудита пинов
 *
 * Query: ?jobId=xxx (обязательно)
 *
 * Только для ADMIN.
 */

import { isAuthError, requireAdmin } from '@/lib/admin-auth'
import { getAuditJob } from '@/lib/audit-job-store'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) {
    return auth
  }

  const jobId = request.nextUrl.searchParams.get('jobId')
  if (!jobId) {
    return NextResponse.json({ error: 'jobId обязателен' }, { status: 400 })
  }

  const job = getAuditJob(jobId)
  if (!job) {
    return NextResponse.json({ error: 'Задача не найдена или истекла' }, { status: 404 })
  }

  return NextResponse.json({
    id: job.id,
    serverId: job.serverId,
    serverName: job.serverName,
    status: job.status,
    phase: job.phase,
    progress: job.progress,
    result: job.result,
    errorMessage: job.errorMessage,
  })
}
