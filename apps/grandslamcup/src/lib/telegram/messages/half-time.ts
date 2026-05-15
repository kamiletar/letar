/**
 * Промежуточный итог тайма для Telegram-канала.
 */

import { playerLink, teamLink } from '../helpers'
import { getMatchCity, loadMatchData } from '../match-data'

/** Промежуточный итог (после тайма) */
export async function formatHalfTimeResult(matchId: string, half: number): Promise<string | null> {
  const match = await loadMatchData(matchId)
  if (!match) {
    return null
  }

  const city = getMatchCity(match)
  const citySlug = city?.slug ?? ''
  const homeLink = teamLink(match.homeTeam.team, citySlug)
  const awayLink = teamLink(match.awayTeam.team, citySlug)

  // Подсчёт баллов за тайм
  const halfPerfs = match.performances.filter((p) => p.half === half)
  const homeScore = halfPerfs
    .filter((p) => p.teamSeason.id === match.homeTeamId)
    .reduce((sum, p) => sum + (p.totalScore ?? 0), 0)
  const awayScore = halfPerfs
    .filter((p) => p.teamSeason.id === match.awayTeamId)
    .reduce((sum, p) => sum + (p.totalScore ?? 0), 0)

  // Лучший игрок тайма
  const bestPerf = halfPerfs.reduce(
    (best, p) => ((p.totalScore ?? 0) > (best?.totalScore ?? 0) ? p : best),
    halfPerfs[0]
  )

  const parts = [
    `⏱ Перерыв | ${half}-й тайм`,
    '',
    `🏠 <b>${homeLink}</b> — <b>${awayLink}</b> 🏁`,
    `${homeScore} : ${awayScore}`,
  ]

  if (bestPerf?.player && bestPerf.totalScore) {
    parts.push('', `🔥 Лучший: ${playerLink(bestPerf.player, citySlug)} (${bestPerf.totalScore})`)
  }

  return parts.join('\n')
}
