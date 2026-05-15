import { isAuthError, requireModeratorOrAdmin } from '@/lib/admin-auth'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

const UpdateReportSchema = z.object({
  status: z.enum(['REVIEWED', 'RESOLVED']),
})

type Params = Promise<{ id: string }>

/**
 * PATCH /api/admin/reports/[id]
 * Обновить статус жалобы
 */
export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  const { id } = await params
  const auth = await requireModeratorOrAdmin()
  if (isAuthError(auth)) {
    return auth
  }
  const { db } = auth

  const body = await request.json()
  const parsed = UpdateReportSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const report = await db.report.update({
    where: { id },
    data: {
      status: parsed.data.status,
    },
  })

  return NextResponse.json({ data: report })
}
