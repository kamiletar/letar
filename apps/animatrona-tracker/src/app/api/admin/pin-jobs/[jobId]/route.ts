import { isAuthError, requireModeratorOrAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type Params = Promise<{ jobId: string }>

/**
 * DELETE /api/admin/pin-jobs/[jobId]
 * Удалить задание на пиннинг.
 * Допустимо только для FAILED и UNPINNED заданий.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  const auth = await requireModeratorOrAdmin()
  if (isAuthError(auth)) {
    return auth
  }

  const { jobId } = await params

  const job = await prisma.pinJob.findUnique({
    where: { id: jobId },
    select: { id: true, status: true },
  })

  if (!job) {
    return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 })
  }

  // Нельзя удалять активные задания — только ошибочные и откреплённые
  if (job.status !== 'FAILED' && job.status !== 'UNPINNED') {
    return NextResponse.json(
      { error: `Удаление возможно только для FAILED/UNPINNED, текущий: ${job.status}` },
      { status: 400 }
    )
  }

  await prisma.pinJob.delete({ where: { id: job.id } })

  return NextResponse.json({ data: { deleted: true } })
}
