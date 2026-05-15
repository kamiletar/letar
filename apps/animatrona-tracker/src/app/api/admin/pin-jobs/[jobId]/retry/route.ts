import { isAuthError, requireModeratorOrAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { createPinJob } from '@/lib/pinning'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type Params = Promise<{ jobId: string }>

/**
 * POST /api/admin/pin-jobs/[jobId]/retry
 * Повторить упавшее задание на пиннинг.
 * Допустимо только для заданий со статусом FAILED.
 */
export async function POST(_request: NextRequest, { params }: { params: Params }) {
  const auth = await requireModeratorOrAdmin()
  if (isAuthError(auth)) {
    return auth
  }
  const { session } = auth

  const { jobId } = await params

  const job = await prisma.pinJob.findUnique({
    where: { id: jobId },
    select: { id: true, cid: true, serverId: true, animeId: true, status: true },
  })

  if (!job) {
    return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 })
  }

  if (job.status !== 'FAILED') {
    return NextResponse.json(
      { error: `Повтор возможен только для статуса FAILED, текущий: ${job.status}` },
      { status: 400 }
    )
  }

  try {
    const result = await createPinJob(job.cid, job.serverId, session.user.id, job.animeId ?? undefined)

    if (result.success) {
      return NextResponse.json({ data: { jobId: result.jobId } })
    }

    return NextResponse.json({ error: result.error ?? 'Ошибка пиннинга' }, { status: 500 })
  } catch (error) {
    console.error('[retry] Ошибка при повторе задания:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера' },
      { status: 500 }
    )
  }
}
