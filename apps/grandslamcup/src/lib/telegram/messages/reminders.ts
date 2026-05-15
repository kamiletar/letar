/**
 * Утренние напоминания "матч сегодня" для Telegram-канала.
 */

import { prisma } from '@/lib/db'
import { formatTime } from '@/lib/format-date'
import { MATCH_TEAMS_NAME_SLUG } from '@/lib/prisma-includes'

import { teamLink, yandexMapsLink } from '../helpers'

const MOSCOW_TZ = 'Europe/Moscow'

/** Напоминание "матч сегодня" для города */
export async function formatTodayReminders(cityId: string): Promise<string[]> {
  const city = await prisma.city.findUnique({ where: { id: cityId } })
  if (!city?.telegramChatId) {
    return []
  }

  // Сегодня (по Москве)
  const now = new Date()
  const todayStart = new Date(now.toLocaleDateString('en-CA', { timeZone: MOSCOW_TZ }) + 'T00:00:00+03:00')
  const todayEnd = new Date(now.toLocaleDateString('en-CA', { timeZone: MOSCOW_TZ }) + 'T23:59:59+03:00')

  const matches = await prisma.match.findMany({
    where: {
      scheduledAt: { gte: todayStart, lte: todayEnd },
      status: 'SCHEDULED',
      OR: [{ tour: { round: { season: { cityId: city.id } } } }, { season: { cityId: city.id } }],
    },
    include: {
      ...MATCH_TEAMS_NAME_SLUG,
      venue: { select: { name: true, address: true, latitude: true, longitude: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  })

  return matches.map((m) => {
    const hLink = teamLink(m.homeTeam.team, city.slug)
    const aLink = teamLink(m.awayTeam.team, city.slug)
    const time = m.scheduledAt ? formatTime(m.scheduledAt) : ''
    const venue = m.venue ? yandexMapsLink(m.venue.name, m.venue.latitude, m.venue.longitude, m.venue.address) : ''

    return [
      '📢 Сегодня матч!',
      '',
      `🏠 <b>${hLink}</b> — <b>${aLink}</b> 🏁`,
      `📅 ${time}${venue ? ` | 📍 ${venue}` : ''}`,
    ].join('\n')
  })
}
