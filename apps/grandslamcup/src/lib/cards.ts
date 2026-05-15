/**
 * Логика карточек по правилам сезона.
 *
 * СПб: 5 жёлтых за сезон = дисквалификация команды
 * Москва: 2 жёлтых за матч = красная, 5 жёлтых за сезон = пропуск матча,
 *         красная = пропуск текущего + следующего
 */

import type { TournamentFormat } from '@/generated/prisma'

/** Правила карточек, зависящие от формата турнира */
export interface CardRules {
  /** 2 жёлтых одного игрока за матч = автоматическая красная */
  doubleYellowEqualsRed: boolean
  /** Что происходит при накоплении 5 жёлтых за сезон */
  yellowAccumulationAction: 'SKIP_MATCH' | 'DISQUALIFY'
  /** Порог накопления жёлтых для действия */
  yellowAccumulationThreshold: number
  /** Сколько матчей пропускает игрок за красную (включая текущий) */
  redCardSkipsMatches: number
  /** Если нет замены — минимальные баллы (6 баллов = все единицы) */
  noReplacementScore: number
}

/** Получить правила карточек по формату турнира */
export function getCardRules(format: TournamentFormat): CardRules {
  if (format === 'SWISS') {
    return {
      doubleYellowEqualsRed: true,
      yellowAccumulationAction: 'SKIP_MATCH',
      yellowAccumulationThreshold: 5,
      redCardSkipsMatches: 2, // текущий + следующий
      noReplacementScore: 6,
    }
  }

  // ROUND_ROBIN (СПб) — по умолчанию
  return {
    doubleYellowEqualsRed: false,
    yellowAccumulationAction: 'DISQUALIFY',
    yellowAccumulationThreshold: 5,
    redCardSkipsMatches: 0,
    noReplacementScore: 6,
  }
}

/** Результат проверки карточки */
export interface CardCheckResult {
  /** Нужно ли выдать красную вместо/в дополнение к жёлтой */
  upgradeToRed: boolean
  /** Нужно ли создать отстранение */
  createSuspension: boolean
  /** Причина отстранения */
  suspensionReason?: 'RED_CARD' | 'DOUBLE_YELLOW' | 'YELLOW_ACCUMULATION' | 'PLAGIARISM'
  /** Сколько матчей отстранения */
  suspensionMatches?: number
  /** Нужно ли дисквалифицировать команду */
  disqualifyTeam: boolean
}

/**
 * Проверяет последствия выдачи карточки.
 *
 * @param rules — правила формата
 * @param cardType — тип выдаваемой карточки (YELLOW / RED)
 * @param playerYellowsInMatch — количество жёлтых этого игрока В ТЕКУЩЕМ матче (до выдачи)
 * @param teamYellowsInSeason — количество жёлтых команды ЗА СЕЗОН (до выдачи)
 */
export function checkCardConsequences(
  rules: CardRules,
  cardType: 'YELLOW' | 'RED',
  playerYellowsInMatch: number,
  teamYellowsInSeason: number
): CardCheckResult {
  const result: CardCheckResult = {
    upgradeToRed: false,
    createSuspension: false,
    disqualifyTeam: false,
  }

  if (cardType === 'RED') {
    // Красная карточка → отстранение
    if (rules.redCardSkipsMatches > 0) {
      result.createSuspension = true
      result.suspensionReason = 'RED_CARD'
      result.suspensionMatches = rules.redCardSkipsMatches
    }
    return result
  }

  // Жёлтая карточка
  const newYellowsInMatch = playerYellowsInMatch + 1
  const newTeamYellowsInSeason = teamYellowsInSeason + 1

  // 2 жёлтых за матч = красная (Москва)
  if (rules.doubleYellowEqualsRed && newYellowsInMatch >= 2) {
    result.upgradeToRed = true
    result.createSuspension = true
    result.suspensionReason = 'DOUBLE_YELLOW'
    result.suspensionMatches = rules.redCardSkipsMatches
  }

  // Накопление жёлтых за сезон
  if (newTeamYellowsInSeason >= rules.yellowAccumulationThreshold) {
    if (rules.yellowAccumulationAction === 'DISQUALIFY') {
      result.disqualifyTeam = true
    } else if (rules.yellowAccumulationAction === 'SKIP_MATCH') {
      // Пропуск следующего матча — создаём отстранение на всю команду?
      // По правилам: команда пропускает матч (техническое поражение)
      // Это обрабатывается на уровне расписания, не через PlayerSuspension
    }
  }

  return result
}
