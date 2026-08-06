/**
 * Чистые функции расчёта статистики поэта.
 */

import { prisma } from '@/lib/db'

export interface PlayerPerf {
  id: string
  totalScore: number | null
  textAdjusted: number | null
  deliveryAdjusted: number | null
  durationSec: number | null
  half: number
  roundNumber: number
  match: {
    id: string
    scheduledAt: Date | null
    homeTeam: { team: { name: string } }
    awayTeam: { team: { name: string } }
  }
  teamSeason: { seasonId: string }
  cards: Array<{ type: string }>
}

export interface PlayerStats {
  matchesPlayed: number
  totalScore: number
  avgScore: number
  bestScore: number
  avgText: number
  avgDelivery: number
  trend: string
  perfectScores: number
  yellowCards: number
  redCards: number
  avgDurationSec: number | null
  roundWins: number
  roundDraws: number
  roundLosses: number
  totalRounds: number
  winPct: number
  isDebut: boolean
}

/** Вычисляет тренд: последние 3 vs предыдущие 3 */
export function computeTrend(scores: number[]): string {
  if (scores.length < 4) {
    return '—'
  }
  const recent = scores.slice(0, 3)
  const prev = scores.slice(3, 6)
  if (prev.length === 0) {
    return '—'
  }
  const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length
  const prevAvg = prev.reduce((s, v) => s + v, 0) / prev.length
  const diff = recentAvg - prevAvg
  if (diff > 2) {
    return '↑'
  }
  if (diff > 0.5) {
    return '↗'
  }
  if (diff > -0.5) {
    return '→'
  }
  if (diff > -2) {
    return '↘'
  }
  return '↓'
}

/** Расчёт статистики поэта из массива перформансов */
export async function computePlayerStats(
  perfs: PlayerPerf[],
  currentSeasonId: string | undefined,
  playerId: string,
): Promise<PlayerStats> {
  const matchesPlayed = perfs.length
  const totalScore = perfs.reduce((sum, p) => sum + p.totalScore!, 0)
  const avgScore = matchesPlayed > 0 ? Math.round((totalScore / matchesPlayed) * 10) / 10 : 0
  const bestScore = matchesPlayed > 0 ? Math.max(...perfs.map((p) => p.totalScore!)) : 0
  const avgText = matchesPlayed > 0
    ? Math.round((perfs.reduce((sum, p) => sum + (p.textAdjusted ?? 0), 0) / matchesPlayed) * 10) / 10
    : 0
  const avgDelivery = matchesPlayed > 0
    ? Math.round((perfs.reduce((sum, p) => sum + (p.deliveryAdjusted ?? 0), 0) / matchesPlayed) * 10) / 10
    : 0
  const trend = computeTrend(perfs.map((p) => p.totalScore!))

  // Тридцатки
  const perfectScores = perfs.filter((p) => p.totalScore === 30).length

  // Карточки текущего сезона
  const seasonPerfs = currentSeasonId ? perfs.filter((p) => p.teamSeason.seasonId === currentSeasonId) : perfs
  const yellowCards = seasonPerfs.reduce((sum, p) => sum + p.cards.filter((c) => c.type === 'YELLOW').length, 0)
  const redCards = seasonPerfs.reduce((sum, p) => sum + p.cards.filter((c) => c.type === 'RED').length, 0)

  // Среднее время
  const perfsWithDuration = perfs.filter((p) => p.durationSec !== null && p.durationSec !== undefined)
  const avgDurationSec = perfsWithDuration.length > 0
    ? Math.round(perfsWithDuration.reduce((sum, p) => sum + p.durationSec!, 0) / perfsWithDuration.length)
    : null

  // Процент побед в раундах
  let roundWins = 0
  let roundDraws = 0
  let roundLosses = 0
  if (matchesPlayed > 0) {
    const allMatchPerfs = await prisma.playerPerformance.findMany({
      where: { matchId: { in: perfs.map((p) => p.match.id) } },
      select: { matchId: true, half: true, roundNumber: true, teamSeasonId: true, totalScore: true, playerId: true },
    })
    for (const perf of perfs) {
      const opponent = allMatchPerfs.find(
        (op) =>
          op.matchId === perf.match.id
          && op.half === perf.half
          && op.roundNumber === perf.roundNumber
          && op.teamSeasonId !== (perf as unknown as { teamSeasonId: string }).teamSeasonId
          && op.playerId !== playerId,
      )
      if (opponent && opponent.totalScore !== null && opponent.totalScore !== undefined) {
        if (perf.totalScore! > opponent.totalScore) {
          roundWins++
        } else if (perf.totalScore! === opponent.totalScore) {
          roundDraws++
        } else {
          roundLosses++
        }
      }
    }
  }
  const totalRounds = roundWins + roundDraws + roundLosses
  const winPct = totalRounds > 0 ? Math.round((roundWins / totalRounds) * 100) : 0

  return {
    matchesPlayed,
    totalScore,
    avgScore,
    bestScore,
    avgText,
    avgDelivery,
    trend,
    perfectScores,
    yellowCards,
    redCards,
    avgDurationSec,
    roundWins,
    roundDraws,
    roundLosses,
    totalRounds,
    winPct,
    isDebut: matchesPlayed === 1,
  }
}
