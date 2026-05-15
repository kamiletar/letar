/**
 * Конфигурация навигации и city-routing хелперы.
 */

import {
  LuCalendarDays,
  LuGitBranch,
  LuHeart,
  LuHouse,
  LuMapPin,
  LuNewspaper,
  LuScale,
  LuShieldAlert,
  LuTrophy,
  LuUserRound,
  LuUsers,
  LuUsersRound,
} from 'react-icons/lu'

/** Страницы, которые существуют внутри города */
export const CITY_NAV_ITEMS = [
  { path: '', label: 'Главная', icon: LuHouse },
  { path: '/standings', label: 'Таблица', icon: LuTrophy },
  { path: '/schedule', label: 'Расписание', icon: LuCalendarDays },
  { path: '/bracket', label: 'Сетка', icon: LuGitBranch },
  { path: '/teams', label: 'Команды', icon: LuUsers },
  { path: '/players', label: 'Поэты', icon: LuUserRound },
  { path: '/venues', label: 'Стадионы', icon: LuMapPin },
  { path: '/rules', label: 'Правила', icon: LuScale },
  { path: '/suspensions', label: 'Дисциплина', icon: LuShieldAlert },
  { path: '/organizers', label: 'Организаторы', icon: LuUsersRound },
]

/** Страницы, которые существуют и на уровне города, и глобально */
export const CITY_AWARE_NAV_ITEMS = [
  { path: '/news', label: 'Новости', icon: LuNewspaper },
  { path: '/donate', label: 'Поддержать', icon: LuHeart },
]

/** Известные глобальные префиксы (не города) */
const GLOBAL_PREFIXES = ['news', 'rules', 'donate', 'admin', 'api', 'match', 'auth', 'coach', 'profile', 'sign-in']

/** Короткие названия городов */
export const CITY_LABELS: Record<string, string> = {
  spb: 'СПб',
  moskva: 'Москва',
}

/** Извлекает citySlug из pathname */
export function extractCitySlug(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) {
    return null
  }
  const first = segments[0]
  if (!first || GLOBAL_PREFIXES.includes(first)) {
    return null
  }
  return first
}

export interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ size?: number }>
}

/** Собирает nav items в зависимости от текущего city */
export function buildNavItems(citySlug: string | null, isHome: boolean): NavItem[] {
  if (isHome) {
    return []
  }
  const cityPrefix = citySlug ? `/${citySlug}` : ''

  if (citySlug) {
    return [
      ...CITY_NAV_ITEMS.map((item) => ({
        href: `${cityPrefix}${item.path}`,
        label: item.label,
        icon: item.icon,
      })),
      ...CITY_AWARE_NAV_ITEMS.map((item) => ({
        href: `${cityPrefix}${item.path}`,
        label: item.label,
        icon: item.icon,
      })),
    ]
  }

  return [
    { href: '/', label: 'Города', icon: LuHouse },
    ...CITY_AWARE_NAV_ITEMS.map((item) => ({
      href: item.path,
      label: item.label,
      icon: item.icon,
    })),
  ]
}
