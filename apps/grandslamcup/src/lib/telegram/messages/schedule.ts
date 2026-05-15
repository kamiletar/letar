/**
 * Расписание матчей на неделю для Telegram-канала.
 */

import { prisma } from '@/lib/db'
import { formatTime } from '@/lib/format-date'
import { MATCH_TEAMS_NAME_SLUG } from '@/lib/prisma-includes'

import { formatTelegramDateShort } from '../format'
import { escapeHtml, teamLink } from '../helpers'

/** Расписание матчей на неделю для города */
export async function formatWeeklySchedule(cityId: string): Promise<string | null> {
  const city = await prisma.city.findUnique({ where: { id: cityId } })
  if (!city?.telegramChatId) {
    return null
  }

  // Понедельник текущей недели — воскресенье
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - now.getDay() + 1)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  const matches = await prisma.match.findMany({
    where: {
      scheduledAt: { gte: monday, lte: sunday },
      status: { in: ['SCHEDULED', 'LIVE'] },
      OR: [{ tour: { round: { season: { cityId: city.id } } } }, { season: { cityId: city.id } }],
    },
    include: {
      ...MATCH_TEAMS_NAME_SLUG,
      venue: { select: { name: true } },
      league: { select: { name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  if (matches.length === 0) {
    return null
  }

  const parts = [`📅 <b>Матчи на этой неделе | ${escapeHtml(city.name)}</b>`]

  let lastDate = ''
  for (const m of matches) {
    const dateStr = m.scheduledAt ? formatTelegramDateShort(m.scheduledAt) : ''
    if (dateStr !== lastDate) {
      parts.push('')
      parts.push(`<b>${dateStr}</b>`)
      lastDate = dateStr
    }

    const hLink = teamLink(m.homeTeam.team, city.slug)
    const aLink = teamLink(m.awayTeam.team, city.slug)
    parts.push(`🏠 ${hLink} — ${aLink} 🏁`)

    const details: string[] = []
    if (m.venue) {
      details.push(`📍 ${escapeHtml(m.venue.name)}`)
    }
    if (m.scheduledAt) {
      details.push(formatTime(m.scheduledAt))
    }
    if (details.length > 0) {
      parts.push(details.join(', '))
    }

    if (m.matchType === 'FRIENDLY') {
      parts.push('⚽ Товарищеский')
    }
  }

  return parts.join('\n')
}
