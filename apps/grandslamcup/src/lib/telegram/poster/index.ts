/**
 * Генерация постеров для Telegram-сообщений.
 */

import { prisma } from '@/lib/db'
import { formatTime } from '@/lib/format-date'
import { MATCH_TEAMS_NAME_SLUG } from '@/lib/prisma-includes'

import { formatTelegramDateShort } from '../format'
import { getMatchCity, loadMatchData } from '../match-data'

import { AnnouncementPoster } from './announcement-poster'
import { renderPoster } from './render'
import { ResultPoster } from './result-poster'
import { SchedulePoster } from './schedule-poster'

/** Сгенерировать PNG постер для анонса матча */
export async function generateAnnouncementPoster(matchId: string): Promise<Buffer | null> {
  const match = await loadMatchData(matchId)
  if (!match) { return null }

  const city = getMatchCity(match)
  const cityName = city?.name ?? ''

  return renderPoster(AnnouncementPoster({ match, cityName }))
}

/** Сгенерировать PNG постер для результата матча */
export async function generateResultPoster(matchId: string): Promise<Buffer | null> {
  const match = await loadMatchData(matchId)
  if (!match) { return null }

  const city = getMatchCity(match)
  const cityName = city?.name ?? ''

  return renderPoster(ResultPoster({ match, cityName }))
}

/** Макс матчей на постере (больше — текст слишком мелкий) */
const MAX_MATCHES_ON_POSTER = 7

/** Сгенерировать PNG постер расписания на неделю */
export async function generateSchedulePoster(cityId: string): Promise<Buffer | null> {
  const city = await prisma.city.findUnique({ where: { id: cityId } })
  if (!city) { return null }

  // Понедельник — воскресенье текущей недели
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
    },
    orderBy: { scheduledAt: 'asc' },
  })

  if (matches.length === 0) { return null }

  // Группируем по дате
  type DayGroup = { date: string; matches: typeof matches }
  const dayMap = new Map<string, DayGroup>()
  let total = 0

  for (const m of matches) {
    const dateStr = m.scheduledAt ? formatTelegramDateShort(m.scheduledAt) : 'Дата не указана'
    let group = dayMap.get(dateStr)
    if (!group) {
      group = { date: dateStr, matches: [] }
      dayMap.set(dateStr, group)
    }
    group.matches.push(m)
    total++
  }

  // Ограничиваем количество матчей на постере
  const visibleCount = Math.min(total, MAX_MATCHES_ON_POSTER)
  const hiddenCount = total - visibleCount

  const days: Array<{
    date: string
    matches: Array<{ homeTeam: string; awayTeam: string; time: string; venue: string; isFriendly: boolean }>
  }> = []

  let shown = 0
  for (const [, group] of dayMap) {
    if (shown >= visibleCount) { break }
    const dayMatches = []
    for (const m of group.matches) {
      if (shown >= visibleCount) { break }
      dayMatches.push({
        homeTeam: m.homeTeam.team.name,
        awayTeam: m.awayTeam.team.name,
        time: m.scheduledAt ? formatTime(m.scheduledAt) : '',
        venue: m.venue?.name ?? '',
        isFriendly: m.matchType === 'FRIENDLY',
      })
      shown++
    }
    days.push({ date: group.date, matches: dayMatches })
  }

  return renderPoster(SchedulePoster({ cityName: city.name, days, hiddenCount }))
}
