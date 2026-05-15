import { isAuthError, requireModeratorOrAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { createPinJob } from '@/lib/pinning'
import { NextResponse } from 'next/server'

/**
 * DELETE /api/admin/pin-jobs/failed
 * Удалить все задания со статусом FAILED.
 */
export async function DELETE() {
  const auth = await requireModeratorOrAdmin()
  if (isAuthError(auth)) {
    return auth
  }

  const result = await prisma.pinJob.deleteMany({
    where: { status: 'FAILED' },
  })

  return NextResponse.json({ data: { deleted: result.count } })
}

/**
 * POST /api/admin/pin-jobs/failed
 * Повторить все задания со статусом FAILED.
 *
 * Возвращает ответ сразу с количеством заданий на повтор,
 * запускает retry в фоне чтобы не получить 504 от Nginx.
 */
export async function POST() {
  const auth = await requireModeratorOrAdmin()
  if (isAuthError(auth)) {
    return auth
  }
  const { session } = auth

  const failedJobs = await prisma.pinJob.findMany({
    where: { status: 'FAILED' },
    select: { id: true, cid: true, serverId: true, animeId: true },
    orderBy: { createdAt: 'asc' },
  })

  if (failedJobs.length === 0) {
    return NextResponse.json({ data: { retried: 0, failed: 0, total: 0 } })
  }

  // Сбрасываем статус FAILED → QUEUED сразу, чтобы UI обновился
  await prisma.pinJob.updateMany({
    where: { id: { in: failedJobs.map((j) => j.id) } },
    data: { status: 'QUEUED', error: null },
  })

  // Запускаем retry в фоне (fire-and-forget) — не блокируем response
  const userId = session.user.id
  void (async () => {
    for (const job of failedJobs) {
      try {
        await createPinJob(job.cid, job.serverId, userId, job.animeId ?? undefined)
      } catch (err) {
        console.error(`[retry-failed] Ошибка для ${job.cid}:`, err)
      }
    }
  })()

  return NextResponse.json({
    data: { retried: failedJobs.length, failed: 0, total: failedJobs.length },
  })
}
