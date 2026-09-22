/**
 * API для загрузки опций формы заявки на товарищеский матч.
 * Возвращает команды из того же сезона (кроме своей) и площадки.
 */

import { getDbUser, getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getDbUser(session)

    // Находим команду тренера в активном сезоне
    const pts = await prisma.playerTeamSeason.findFirst({
      where: {
        player: { userId: user.id },
        role: { in: ['COACH', 'ASSISTANT_COACH'] },
        leftAt: null,
        teamSeason: { season: { status: 'ACTIVE' } },
      },
      include: {
        teamSeason: {
          select: { id: true, seasonId: true },
        },
      },
    })

    if (!pts) {
      return NextResponse.json({ teams: [], venues: [] })
    }

    // Команды из того же сезона (кроме своей)
    const teamSeasons = await prisma.teamSeason.findMany({
      where: {
        seasonId: pts.teamSeason.seasonId,
        id: { not: pts.teamSeason.id },
      },
      include: {
        team: { select: { name: true } },
      },
      orderBy: { team: { name: 'asc' } },
    })

    // Все площадки
    const venues = await prisma.venue.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })

    // `(typeof teamSeasons)[number]` на параметре callback не спас — понадобился явный узкий
    // interface + аннотация переменной перед `.map()`, см.
    // .claude/docs/tsgo-excessive-stack-depth-zenstack.md, подпаттерн 1.
    interface FriendlyTeamRow {
      id: string
      team: { name: string }
    }
    const teamRows: FriendlyTeamRow[] = teamSeasons

    return NextResponse.json({
      teams: teamRows.map((ts) => ({
        id: ts.id,
        teamName: ts.team.name,
      })),
      venues,
    })
  } catch (error) {
    console.error('[friendly-options] ошибка:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
