/**
 * GET /api/coach/available-players — игроки из других команд для трансферов.
 * Возвращает только при открытом трансферном окне.
 * Query: ?search=имя (опционально)
 */

import { prisma } from '@/lib/db'
import { requireCoachAction } from '@/lib/roles'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const auth = await requireCoachAction()
  if (!auth.success) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  // Проверяем трансферное окно
  const season = await prisma.season.findFirst({
    where: { id: auth.coach.seasonId },
    select: { transferWindowOpen: true },
  })

  if (!season?.transferWindowOpen) {
    return NextResponse.json({ error: 'Трансферное окно закрыто', players: [] })
  }

  const search = request.nextUrl.searchParams.get('search') || ''

  // Находим игроков из других команд в этом сезоне
  const players = await prisma.playerTeamSeason.findMany({
    where: {
      teamSeason: { seasonId: auth.coach.seasonId },
      teamSeasonId: { not: auth.coach.teamSeasonId },
      leftAt: null,
      player: search ? { name: { contains: search, mode: 'insensitive' } } : undefined,
    },
    include: {
      player: { select: { id: true, name: true, slug: true, cityId: true } },
      teamSeason: {
        include: { team: { select: { id: true, name: true } } },
      },
    },
    take: 50,
    orderBy: { player: { name: 'asc' } },
  })

  // `(typeof players)[number]` на параметре callback не спас (сам typeof уже требует структурной
  // экспансии) — понадобился явный узкий interface + аннотация переменной перед `.map()`, см.
  // .claude/docs/tsgo-excessive-stack-depth-zenstack.md, подпаттерн 1.
  interface AvailablePlayerRow {
    player: { id: string; name: string; slug: string }
    teamSeasonId: string
    teamSeason: { team: { name: string } }
    role: string
  }
  const rows: AvailablePlayerRow[] = players

  return NextResponse.json(
    rows.map((pts) => ({
      playerId: pts.player.id,
      playerName: pts.player.name,
      playerSlug: pts.player.slug,
      teamSeasonId: pts.teamSeasonId,
      teamName: pts.teamSeason.team.name,
      role: pts.role,
    })),
  )
}
