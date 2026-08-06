/**
 * HTML-хелперы для Telegram: экранирование, ссылки.
 */

import { playerDisplayName } from '@/lib/player-utils'

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://grandslamcup.letar.best'

/** HTML-экранирование для Telegram */
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Ссылка на профиль поэта */
export function playerLink(
  player: { name: string; slug: string; disambiguation?: string | null },
  citySlug: string,
): string {
  const display = escapeHtml(playerDisplayName(player))
  return `<a href="${SITE_URL}/${citySlug}/players/${player.slug}">${display}</a>`
}

/** Ссылка на страницу команды */
export function teamLink(team: { name: string; slug: string }, citySlug: string): string {
  const display = escapeHtml(team.name)
  if (!citySlug) return display
  return `<a href="${SITE_URL}/${citySlug}/teams/${team.slug}">${display}</a>`
}

/** Построить URL матча на сайте */
export function matchUrl(matchId: string, citySlug: string): string {
  return `${SITE_URL}/${citySlug}/matches/${matchId}`
}

/** Построить URL расписания города */
export function scheduleUrl(citySlug: string): string {
  return `${SITE_URL}/${citySlug}/schedule`
}

/** Ссылка на Яндекс.Карты по координатам */
export function yandexMapsLink(
  name: string,
  lat?: number | null,
  lng?: number | null,
  address?: string | null,
): string {
  const display = escapeHtml(name + (address ? `, ${address}` : ''))
  if (lat && lng) {
    return `<a href="https://yandex.ru/maps/?pt=${lng},${lat}&z=17&l=map">${display}</a>`
  }
  if (address) {
    return `<a href="https://yandex.ru/maps/?text=${encodeURIComponent(address)}">${display}</a>`
  }
  return display
}
