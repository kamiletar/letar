/**
 * POST /api/teams/update-profile — обновление профиля команды.
 * Доступно: admin, тренер/зам этой команды.
 */

import { prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

const Schema = z
  .object({
    teamId: z.string().min(1),
    description: z.string().max(2000).nullable(),
    socialLinks: z.array(z.object({ platform: z.string(), url: z.string() })),
  })
  .strip()

export async function POST(request: NextRequest) {
  try {
    const { getSession, getDbUser } = await import('@/lib/auth')
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const user = await getDbUser(session)
    const isAdmin = user.roles?.includes('ADMIN') ?? false

    const body = await request.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 })
    }

    const { teamId, description, socialLinks } = parsed.data

    // Проверка прав: admin или тренер/зам этой команды
    if (!isAdmin) {
      const teamSeasons = await prisma.teamSeason.findMany({
        where: { teamId },
        select: { id: true },
      })
      const coachRecord = await prisma.playerTeamSeason.findFirst({
        where: {
          player: { userId: user.id },
          role: { in: ['COACH', 'ASSISTANT_COACH'] },
          teamSeasonId: { in: teamSeasons.map((ts) => ts.id) },
          leftAt: null,
        },
      })
      if (!coachRecord) {
        return NextResponse.json({ error: 'Нет прав' }, { status: 403 })
      }
    }

    await prisma.team.update({
      where: { id: teamId },
      data: { description, socialLinks },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[/api/teams/update-profile]', error)
    return NextResponse.json({ error: 'Внутренняя ошибка' }, { status: 500 })
  }
}
