/**
 * Переиспользуемые Prisma include/select паттерны.
 * Сокращают дублирование в запросах матчей, команд, турниров.
 */

/** Только имя команды */
export const TEAM_NAME = { select: { name: true } } as const

/** Имя + slug команды */
export const TEAM_NAME_SLUG = { select: { name: true, slug: true } } as const

/** Имя + slug + логотип команды */
export const TEAM_NAME_SLUG_LOGO = { select: { name: true, slug: true, logo: true } } as const

/** homeTeam + awayTeam → только имя */
export const MATCH_TEAMS_NAME = {
  homeTeam: { include: { team: TEAM_NAME } },
  awayTeam: { include: { team: TEAM_NAME } },
} as const

/** homeTeam + awayTeam → имя + slug */
export const MATCH_TEAMS_NAME_SLUG = {
  homeTeam: { include: { team: TEAM_NAME_SLUG } },
  awayTeam: { include: { team: TEAM_NAME_SLUG } },
} as const

/** homeTeam + awayTeam → имя + slug + логотип */
export const MATCH_TEAMS_FULL = {
  homeTeam: { include: { team: TEAM_NAME_SLUG_LOGO } },
  awayTeam: { include: { team: TEAM_NAME_SLUG_LOGO } },
} as const

/** tour → round → season (имя сезона) */
export const TOUR_WITH_SEASON = {
  include: { round: { include: { season: { select: { name: true } } } } },
} as const
