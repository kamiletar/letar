/**
 * GET /api/coach/applications — список заявок команды тренера
 */

import { prisma } from '@/lib/db'
import { requireCoachAction } from '@/lib/roles'
import { NextResponse } from 'next/server'

export async function GET() {
  const auth = await requireCoachAction()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const applications = await prisma.rosterApplication.findMany({
    where: { toTeamSeasonId: auth.coach.teamSeasonId },
    include: {
      player: { select: { id: true, name: true, slug: true } },
      fromTeamSeason: {
        include: { team: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(applications)
}
