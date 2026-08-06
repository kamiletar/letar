/**
 * Итоги тура: таблица лиги, лучший игрок, топ-3 перформанса.
 * Автоматически публикуется когда все матчи тура завершены.
 *
 * @module tour-summary
 */

import { prisma } from '@/lib/db'

import { escapeHtml, playerLink, teamLink } from '../helpers'

/** Сформировать сообщение "Итоги тура" */
export async function formatTourSummary(tourId: string): Promise<{ text: string; citySlug: string } | null> {
  const tour = await prisma.tour.findUnique({
    where: { id: tourId },
    include: {
      round: {
        include: {
          season: {
            include: {
              city: { select: { slug: true, name: true, telegramChatId: true } },
            },
          },
        },
      },
      matches: {
        include: {
          homeTeam: { include: { team: { select: { name: true, slug: true } } } },
          awayTeam: { include: { team: { select: { name: true, slug: true } } } },
          league: { select: { name: true } },
          performances: {
            include: {
              player: { select: { name: true, slug: true, disambiguation: true } },
              teamSeason: { include: { team: { select: { name: true, slug: true } } } },
            },
          },
        },
      },
    },
  })

  if (!tour) return null

  const city = tour.round?.season?.city
  if (!city) return null
  const citySlug = city.slug

  const leagueName = tour.matches[0]?.league?.name ?? ''

  const parts: string[] = [
    `📊 <b>Итоги ${tour.number} тура${leagueName ? ` • ${escapeHtml(leagueName)}` : ''} | ${escapeHtml(city.name)}</b>`,
    '',
  ]

  // Результаты матчей тура
  for (const m of tour.matches) {
    const hLink = teamLink(m.homeTeam.team, citySlug)
    const aLink = teamLink(m.awayTeam.team, citySlug)
    const score = m.homeScore !== null && m.awayScore !== null ? `${m.homeScore}:${m.awayScore}` : '—'
    parts.push(`${hLink} ${score} ${aLink}`)
  }

  // Лучший игрок тура (максимальный totalScore среди всех перформансов)
  const allPerfs = tour.matches.flatMap((m) => m.performances)
  const bestPerf = allPerfs.reduce((best, p) => ((p.totalScore ?? 0) > (best?.totalScore ?? 0) ? p : best), allPerfs[0])

  if (bestPerf?.player && bestPerf.totalScore) {
    parts.push(
      '',
      `⭐ <b>Лучший:</b> ${playerLink(bestPerf.player, citySlug)} (${bestPerf.totalScore}) — ${
        escapeHtml(
          bestPerf.teamSeason.team.name,
        )
      }`,
    )
  }

  // Топ-3 перформанса
  const top3 = [...allPerfs]
    .filter((p) => p.totalScore !== null && p.totalScore > 0)
    .sort((a, b) => (b.totalScore ?? 0) - (a.totalScore ?? 0))
    .slice(0, 3)

  if (top3.length > 1) {
    parts.push('', '🔥 <b>Топ-3:</b>')
    top3.forEach((p, i) => {
      const medal = ['🥇', '🥈', '🥉'][i]
      parts.push(`${medal} ${playerLink(p.player, citySlug)} — ${p.totalScore} (${escapeHtml(p.teamSeason.team.name)})`)
    })
  }

  return { text: parts.join('\n'), citySlug }
}
