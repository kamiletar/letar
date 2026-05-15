/**
 * Анонс матча (афиша) для Telegram-канала.
 */

import { formatTelegramDate } from '../format'
import { escapeHtml, playerLink, teamLink, yandexMapsLink } from '../helpers'
import { getMatchCity, isDebut, loadMatchData } from '../match-data'

/** Анонс матча (афиша) */
export async function formatMatchAnnouncement(matchId: string): Promise<string | null> {
  const match = await loadMatchData(matchId)
  if (!match) {
    return null
  }

  const city = getMatchCity(match)
  const citySlug = city?.slug ?? ''
  const isFriendly = match.matchType === 'FRIENDLY'

  // Заголовок
  const header = isFriendly
    ? '⚽ Товарищеский матч'
    : `🏆 КБС${match.league ? ` | ${escapeHtml(match.league.name)}` : ''}`

  // Дата
  const dateStr = match.scheduledAt ? `📅 ${formatTelegramDate(match.scheduledAt)}` : ''

  // Площадка
  const venueStr = match.venue
    ? `📍 ${yandexMapsLink(match.venue.name, match.venue.latitude, match.venue.longitude, match.venue.address)}`
    : ''

  // Составы
  const homeLineup = match.lineups.filter((l) => l.teamSeason.id === match.homeTeamId)
  const awayLineup = match.lineups.filter((l) => l.teamSeason.id === match.awayTeamId)

  const formatLineup = async (lineup: typeof homeLineup) => {
    const lines: string[] = []
    for (let i = 0; i < lineup.length; i++) {
      const l = lineup[i]
      const debut = await isDebut(l.player.slug, match.scheduledAt)
      const link = playerLink(l.player, citySlug)
      lines.push(`${i + 1}. ${link}${debut ? ' 🆕' : ''}`)
    }
    return lines.join('\n')
  }

  const homeLink = teamLink(match.homeTeam.team, citySlug)
  const awayLink = teamLink(match.awayTeam.team, citySlug)
  const homeList = await formatLineup(homeLineup)
  const awayList = await formatLineup(awayLineup)

  // Ведущий / счетовод
  const roles: string[] = []
  if (match.presenterUser?.name) {
    roles.push(`🎤 ${escapeHtml(match.presenterUser.name)}`)
  }
  if (match.scorerUser?.name) {
    roles.push(`📊 ${escapeHtml(match.scorerUser.name)}`)
  }
  const rolesStr = roles.length > 0 ? roles.join(' | ') : ''

  const parts = [
    header,
    dateStr,
    venueStr,
    '',
    `🏠 <b>${homeLink}</b>`,
    homeList || '<i>Состав не заявлен</i>',
    '',
    `🏁 <b>${awayLink}</b>`,
    awayList || '<i>Состав не заявлен</i>',
  ]

  if (rolesStr) {
    parts.push('', rolesStr)
  }
  return parts.filter((p) => p !== undefined).join('\n')
}
