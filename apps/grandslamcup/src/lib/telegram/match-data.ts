/**
 * Запросы данных матча для формирования Telegram-сообщений.
 */

import { prisma } from '@/lib/db'

// Ручной interface вместо `NonNullable<Awaited<ReturnType<typeof loadMatchData>>>` — tsgo
// TS2321 (Excessive stack depth) уже на объявлении такого алиаса, подпаттерн 1a из
// .claude/docs/tsgo-excessive-stack-depth-zenstack.md. Поля — по факту использования во всех
// потребителях loadMatchData()/MatchData (src/lib/telegram/**), не полный список select-полей:
// структурная типизация допускает у реального объекта больше полей, чем в этом interface.
interface PlayerRef {
  name: string
  slug: string
  disambiguation: string | null
}

interface CityRef {
  slug: string
  name: string
}

export interface MatchData {
  id: string
  matchType: string
  scheduledAt: Date | null
  // Float @default(0), не nullable — schema/matches.zmodel:117,119
  homeScore: number
  awayScore: number
  homeTeamId: string
  awayTeamId: string
  venue:
    | { name: string; slug: string; address: string | null; latitude: number | null; longitude: number | null }
    | null
  league: { name: string } | null
  homeTeam: { team: { name: string; slug: string } }
  awayTeam: { team: { name: string; slug: string } }
  tour: { round: { season: { city: CityRef } | null } | null } | null
  season: { city: CityRef } | null
  lineups: { player: PlayerRef; teamSeason: { id: string } }[]
  performances: {
    player: PlayerRef
    teamSeason: { id: string }
    // CardReason enum, не nullable — schema/matches.zmodel:252
    cards: { type: string; reason: string }[]
    totalScore: number | null
    half: number
  }[]
  scorerUser: { name: string | null } | null
  presenterUser: { name: string | null } | null
}

/** Полные данные матча для формирования сообщений */
export async function loadMatchData(matchId: string): Promise<MatchData | null> {
  const match: MatchData | null = await prisma.match.findUnique({
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
  return match
}

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
