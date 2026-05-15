/**
 * Запросы данных матча для формирования Telegram-сообщений.
 */

import { prisma } from '@/lib/db'

/** Полные данные матча для формирования сообщений */
export async function loadMatchData(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { include: { team: { select: { name: true, slug: true } } } },
      awayTeam: { include: { team: { select: { name: true, slug: true } } } },
      venue: { select: { name: true, slug: true, address: true, latitude: true, longitude: true } },
      league: { select: { name: true } },
      tour: { include: { round: { include: { season: { include: { city: true } } } } } },
      season: { include: { city: true } },
      lineups: {
        include: {
          player: { select: { name: true, slug: true, disambiguation: true } },
          teamSeason: { select: { id: true } },
        },
        orderBy: { order: 'asc' },
      },
      performances: {
        include: {
          player: { select: { name: true, slug: true, disambiguation: true } },
          teamSeason: { select: { id: true } },
          cards: true,
        },
        orderBy: [{ half: 'asc' }, { roundNumber: 'asc' }],
      },
      scorerUser: { select: { name: true } },
      presenterUser: { select: { name: true } },
    },
  })
}

export type MatchData = NonNullable<Awaited<ReturnType<typeof loadMatchData>>>

/** Получить город и slug из данных матча */
export function getMatchCity(match: MatchData) {
  return match.tour?.round?.season?.city ?? match.season?.city
}

/** Проверка: дебют ли поэт (первый матч в КБС) */
export async function isDebut(playerId: string, matchDate: Date | null): Promise<boolean> {
  if (!matchDate) {
    return false
  }
  const prevMatches = await prisma.matchLineup.count({
    where: {
      playerId,
      match: { scheduledAt: { lt: matchDate }, status: 'FINISHED' },
    },
  })
  return prevMatches === 0
}
