/**
 * Типы репутации пользователя
 *
 * Система репутации на основе метрик раздачи контента.
 * Score рассчитывается из нескольких компонентов.
 */

// ============================================================================
// Ранги пользователя
// ============================================================================

/**
 * Ранги пользователя (зависят от score)
 */
export enum UserRank {
  /** 0-19 очков — новичок */
  NEWCOMER = 'NEWCOMER',
  /** 20-39 очков — контрибьютор */
  CONTRIBUTOR = 'CONTRIBUTOR',
  /** 40-59 очков — постоянный участник */
  REGULAR = 'REGULAR',
  /** 60-79 очков — ветеран */
  VETERAN = 'VETERAN',
  /** 80-100 очков — легенда */
  LEGEND = 'LEGEND',
}

/**
 * Метаданные ранга
 */
export interface RankInfo {
  /** ID ранга */
  id: UserRank
  /** Название */
  name: string
  /** Описание */
  description: string
  /** Минимальный score */
  minScore: number
  /** Максимальный score (exclusive) */
  maxScore: number
  /** Цвет для UI (hex) */
  color: string
  /** Иконка (emoji) */
  icon: string
}

/**
 * Информация о всех рангах
 */
export const RANKS: Record<UserRank, RankInfo> = {
  [UserRank.NEWCOMER]: {
    id: UserRank.NEWCOMER,
    name: 'Новичок',
    description: 'Только начинаете свой путь раздачи',
    minScore: 0,
    maxScore: 20,
    color: '#718096',
    icon: '🌱',
  },
  [UserRank.CONTRIBUTOR]: {
    id: UserRank.CONTRIBUTOR,
    name: 'Контрибьютор',
    description: 'Активно участвуете в раздаче',
    minScore: 20,
    maxScore: 40,
    color: '#38A169',
    icon: '🌿',
  },
  [UserRank.REGULAR]: {
    id: UserRank.REGULAR,
    name: 'Постоянный',
    description: 'Надёжный участник сообщества',
    minScore: 40,
    maxScore: 60,
    color: '#3182CE',
    icon: '⭐',
  },
  [UserRank.VETERAN]: {
    id: UserRank.VETERAN,
    name: 'Ветеран',
    description: 'Опытный сидер с отличной репутацией',
    minScore: 60,
    maxScore: 80,
    color: '#805AD5',
    icon: '💎',
  },
  [UserRank.LEGEND]: {
    id: UserRank.LEGEND,
    name: 'Легенда',
    description: 'Один из лучших сидеров сообщества',
    minScore: 80,
    maxScore: 101,
    color: '#D69E2E',
    icon: '👑',
  },
}

// ============================================================================
// Репутация пользователя
// ============================================================================

/**
 * Репутация пользователя
 */
export interface UserReputation {
  /** Общий score (0-100) */
  score: number
  /** Текущий ранг */
  rank: UserRank

  // === Компоненты score ===

  /** Score за соотношение upload/download (0-30) */
  ratioScore: number
  /** Score за время раздачи (0-25) */
  seedingTimeScore: number
  /** Score за количество уникального контента (0-20) */
  uniqueContentScore: number
  /** Score за помощь пирам (0-15) */
  helpedPeersScore: number
  /** Score за время в сообществе (0-10) */
  longevityScore: number

  /** Дата последнего обновления (ISO string) */
  updatedAt: string
}

/**
 * Начальная репутация для нового пользователя
 */
export const INITIAL_USER_REPUTATION: UserReputation = {
  score: 0,
  rank: UserRank.NEWCOMER,
  ratioScore: 0,
  seedingTimeScore: 0,
  uniqueContentScore: 0,
  helpedPeersScore: 0,
  longevityScore: 0,
  updatedAt: new Date().toISOString(),
}

// ============================================================================
// Веса компонентов
// ============================================================================

/**
 * Максимальные значения компонентов репутации
 */
export const REPUTATION_WEIGHTS = {
  /** Максимум за ratio */
  MAX_RATIO_SCORE: 30,
  /** Максимум за время раздачи */
  MAX_SEEDING_TIME_SCORE: 25,
  /** Максимум за уникальный контент */
  MAX_UNIQUE_CONTENT_SCORE: 20,
  /** Максимум за помощь пирам */
  MAX_HELPED_PEERS_SCORE: 15,
  /** Максимум за время в сообществе */
  MAX_LONGEVITY_SCORE: 10,
}

/**
 * Пороговые значения для расчёта score
 */
export const REPUTATION_THRESHOLDS = {
  /** Ratio для максимального score (3x) */
  RATIO_FOR_MAX: 3,
  /** Часов раздачи для максимального score (720 часов = 30 дней) */
  SEEDING_HOURS_FOR_MAX: 720,
  /** Уникальных CID для максимального score */
  UNIQUE_CONTENT_FOR_MAX: 100,
  /** Пиров для максимального score */
  PEERS_HELPED_FOR_MAX: 1000,
  /** Дней в сообществе для максимального score */
  DAYS_FOR_MAX_LONGEVITY: 365,
}

// ============================================================================
// IPC типы
// ============================================================================

/**
 * Результат операции с репутацией
 */
export interface ReputationOperationResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * События репутации
 */
export type ReputationEventType = 'reputation:updated' | 'reputation:rankChanged'

/**
 * Payload события изменения ранга
 */
export interface RankChangedEvent {
  oldRank: UserRank
  newRank: UserRank
  score: number
}
