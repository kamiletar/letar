/**
 * GET /api/auth/me — данные текущего пользователя.
 * Возвращает: { user, isAdmin, isCoach, isPoet, isOrganizer, isScorer, isPresenter } или null если не авторизован.
 */

import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { getSession, getDbUser } = await import('@/lib/auth')
    const session = await getSession()
    if (!session) {
      return NextResponse.json(null)
    }

    const user = await getDbUser(session)
    const isAdmin = user.roles?.includes('ADMIN') ?? false

    // Проверяем роли параллельно
    const [coachRecord, organizerRecord, poetRecord, scorerRecord, presenterRecord] = await Promise.all([
      // Тренер в активном сезоне
      prisma.playerTeamSeason.findFirst({
        where: {
          player: { userId: user.id },
          role: { in: ['COACH', 'ASSISTANT_COACH'] },
          leftAt: null,
          teamSeason: { season: { status: 'ACTIVE' } },
        },
        select: { id: true },
      }),
      // Организатор города
      prisma.cityOrganizer.findFirst({
        where: { userId: user.id },
        select: { id: true },
      }),
      // Поэт (привязан к Player)
      prisma.player.findFirst({
        where: { userId: user.id },
        select: { id: true },
      }),
      // Счетовод — есть хоть один матч с scorerUserId === user.id
      prisma.match.findFirst({
        where: { scorerUserId: user.id },
        select: { id: true },
      }),
      // Ведущий — есть хоть один матч с presenterUserId === user.id
      prisma.match.findFirst({
        where: { presenterUserId: user.id },
        select: { id: true },
      }),
    ])

    return NextResponse.json({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      },
      isAdmin,
      isCoach: !!coachRecord,
      isPoet: !!poetRecord,
      isOrganizer: !!organizerRecord,
      isScorer: !!scorerRecord,
      isPresenter: !!presenterRecord,
    })
  } catch (error) {
    console.error('[/api/auth/me] Error:', error)
    return NextResponse.json(null, { status: 500 })
  }
}
