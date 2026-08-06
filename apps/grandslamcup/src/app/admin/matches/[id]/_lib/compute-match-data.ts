/**
 * Чистые функции для подготовки данных матча:
 * MVP, подсчёт карточек, разбивка по таймам, определение победителя.
 */

import { playerDisplayName } from '@/lib/player-utils'
import { findMatchMVP } from '@/lib/scoring'

/** Минимальный тип выступления для вычислений */
interface PerformanceLike {
  playerId: string
  player: { id: string; name: string; slug: string; disambiguation: string | null }
  totalScore: number | null
  half: number
  cards: { id: string; type: string; reason: string | null }[]
}

/** Результат подсчёта карточек */
export interface CardStats {
  total: number
  yellow: number
  red: number
}

/** MVP матча */
export interface MvpInfo {
  playerName: string
  totalScore: number | null
}

/** Подсчёт карточек по всем выступлениям */
export function computeCardStats(performances: PerformanceLike[]): CardStats {
  let total = 0
  let yellow = 0
  let red = 0

  for (const p of performances) {
    for (const c of p.cards) {
      total++
      if (c.type === 'YELLOW') yellow++
      if (c.type === 'RED') red++
    }
  }

  return { total, yellow, red }
}

/** Определение MVP матча (только для завершённых) */
export function computeMvp(performances: PerformanceLike[], isFinished: boolean): MvpInfo | null {
  if (!isFinished) return null

  const result = findMatchMVP(
    performances.map((p) => ({
      playerName: playerDisplayName(p.player),
      totalScore: p.totalScore,
    })),
  )

  return result
}

/** Разбивка выступлений по таймам */
export function splitByHalves<T extends { half: number }>(performances: T[]): { half1: T[]; half2: T[] } {
  return {
    half1: performances.filter((p) => p.half === 1),
    half2: performances.filter((p) => p.half === 2),
  }
}

/** Определение победителя */
export function computeWinner(
  homeScore: number,
  awayScore: number,
  isFinished: boolean,
): { homeWins: boolean; awayWins: boolean } {
  return {
    homeWins: isFinished && homeScore > awayScore,
    awayWins: isFinished && awayScore > homeScore,
  }
}
