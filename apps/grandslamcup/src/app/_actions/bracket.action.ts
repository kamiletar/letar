'use server'

/**
 * Публичный action для получения данных турнирной сетки.
 * Без авторизации — для публичной и admin страниц.
 */

import { prisma } from '@/lib/db'

/**
 * Получает данные сетки с расширенными includes
 * для визуализации (команды обоих сторон, source слоты, loserGoesTo).
 */
export async function getBracketDataAction(seasonId: string) {
  try {
    const slots = await prisma.bracketSlot.findMany({
      where: { seasonId },
      include: {
        stage: { select: { type: true, name: true, order: true } },
        teamSeason: {
          include: { team: { select: { name: true, slug: true } } },
        },
        match: {
          select: {
            id: true,
            status: true,
            homeScore: true,
            awayScore: true,
            homeTeamId: true,
            awayTeamId: true,
          },
        },
        sourceSlot1: {
          select: {
            id: true,
            teamSeasonId: true,
            teamSeason: { include: { team: { select: { name: true, slug: true } } } },
          },
        },
        sourceSlot2: {
          select: {
            id: true,
            teamSeasonId: true,
            teamSeason: { include: { team: { select: { name: true, slug: true } } } },
          },
        },
      },
      orderBy: [{ stage: { order: 'asc' } }, { roundNumber: 'asc' }, { slotNumber: 'asc' }],
    })

    return { data: slots }
  } catch (error) {
    console.error('[getBracketDataAction] ошибка:', error)
    return { error: 'Не удалось загрузить данные сетки' }
  }
}
