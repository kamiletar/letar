/**
 * Финальный результат матча для Telegram-канала.
 */

import { playerDisplayName } from '@/lib/player-utils'

import { escapeHtml, playerLink, teamLink } from '../helpers'
import { getMatchCity, loadMatchData } from '../match-data'

/** Финальный результат матча */
export async function formatMatchResult(matchId: string): Promise<string | null> {
  const match = await loadMatchData(matchId)
  if (!match) {
    return null
  }

  const city = getMatchCity(match)
  const citySlug = city?.slug ?? ''
  const isFriendly = match.matchType === 'FRIENDLY'
  const homeLink = teamLink(match.homeTeam.team, citySlug)
  const awayLink = teamLink(match.awayTeam.team, citySlug)

  // Заголовок
  const header = isFriendly
    ? '⚽ Товарищеский матч завершён!'
    : `🏆 КБС${match.league ? ` | ${escapeHtml(match.league.name)}` : ''}`

  // Баллы по таймам
  const half1 = match.performances.filter((p) => p.half === 1)
  const half2 = match.performances.filter((p) => p.half === 2)
  const h1Home = half1.filter((p) => p.teamSeason.id === match.homeTeamId).reduce((s, p) => s + (p.totalScore ?? 0), 0)
  const h1Away = half1.filter((p) => p.teamSeason.id === match.awayTeamId).reduce((s, p) => s + (p.totalScore ?? 0), 0)
  const h2Home = half2.filter((p) => p.teamSeason.id === match.homeTeamId).reduce((s, p) => s + (p.totalScore ?? 0), 0)
  const h2Away = half2.filter((p) => p.teamSeason.id === match.awayTeamId).reduce((s, p) => s + (p.totalScore ?? 0), 0)

  // MVP — лучший суммарный балл
  const playerScores = new Map<string, { player: (typeof match.performances)[0]['player']; total: number }>()
  for (const p of match.performances) {
    const key = p.player.slug
    const existing = playerScores.get(key)
    if (existing) {
      existing.total += p.totalScore ?? 0
    } else {
      playerScores.set(key, { player: p.player, total: p.totalScore ?? 0 })
    }
  }
  const mvp = [...playerScores.values()].sort((a, b) => b.total - a.total)[0]

  // Карточки
  const cards = match.performances.flatMap((p) =>
    p.cards.map((c) => ({
      player: p.player,
      type: c.type,
      reason: c.reason,
    }))
  )

  const CARD_REASON_MAP: Record<string, string> = {
    OVERTIME: 'превышение времени',
    SINGING: 'пение',
    PERFORMANCE: 'запрещённый перфоманс',
    UNSANCTIONED_DISS: 'несогласованный дисс',
    INSULT: 'оскорбление',
    AGGRESSION: 'физическая агрессия',
    OTHER: 'нарушение',
  }

  const hasPerformances = match.performances.length > 0

  const parts = [
    '🏁 Матч завершён!',
    header,
    '',
    `🏠 <b>${homeLink}</b>  ${match.homeScore} : ${match.awayScore}  <b>${awayLink}</b> 🏁`,
  ]

  // Победитель
  if (match.homeScore > match.awayScore) {
    parts.push('', `🎉 Победила команда <b>${homeLink}</b>!`)
  } else if (match.awayScore > match.homeScore) {
    parts.push('', `🎉 Победила команда <b>${awayLink}</b>!`)
  } else {
    parts.push('', '🤝 Ничья!')
  }

  // Итоги по таймам — только если есть детализация выступлений
  if (hasPerformances) {
    parts.push('', `1-й тайм: ${h1Home} : ${h1Away}`, `2-й тайм: ${h2Home} : ${h2Away}`)
  }

  // Составы: с баллами (из performances) или без (из lineups)
  if (hasPerformances) {
    const homePerfs = [...playerScores.entries()]
      .filter(([slug]) =>
        match.performances.some((p) => p.player.slug === slug && p.teamSeason.id === match.homeTeamId)
      )
      .sort((a, b) => b[1].total - a[1].total)
    const awayPerfs = [...playerScores.entries()]
      .filter(([slug]) =>
        match.performances.some((p) => p.player.slug === slug && p.teamSeason.id === match.awayTeamId)
      )
      .sort((a, b) => b[1].total - a[1].total)

    const formatPerf = (entries: typeof homePerfs) =>
      entries.map(([, { player, total }]) => `  ${playerLink(player, citySlug)} — ${total}`).join('\n')

    parts.push('', `🏠 <b>${homeLink}</b>`)
    if (homePerfs.length > 0) parts.push(formatPerf(homePerfs))
    parts.push('', `🏁 <b>${awayLink}</b>`)
    if (awayPerfs.length > 0) parts.push(formatPerf(awayPerfs))
  } else if (match.lineups.length > 0) {
    // Fallback: составы из lineups (без баллов)
    const homeLineup = match.lineups.filter((l) => l.teamSeason.id === match.homeTeamId)
    const awayLineup = match.lineups.filter((l) => l.teamSeason.id === match.awayTeamId)

    const formatLineup = (lineup: typeof homeLineup) =>
      lineup.map((l) => `  ${playerLink(l.player, citySlug)}`).join('\n')

    parts.push('', `🏠 <b>${homeLink}</b>`)
    if (homeLineup.length > 0) parts.push(formatLineup(homeLineup))
    parts.push('', `🏁 <b>${awayLink}</b>`)
    if (awayLineup.length > 0) parts.push(formatLineup(awayLineup))
  }

  if (mvp) {
    parts.push('', `⭐ MVP: ${playerLink(mvp.player, citySlug)} (${mvp.total})`)
  }

  for (const card of cards) {
    const emoji = card.type === 'RED' ? '🟥' : '🟨'
    const reason = CARD_REASON_MAP[card.reason] ?? card.reason
    parts.push(`${emoji} ${escapeHtml(playerDisplayName(card.player))} (${reason})`)
  }

  return parts.join('\n')
}
