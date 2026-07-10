/**
 * Типы достижений пользователя
 *
 * Система достижений с условиями и наградами за раздачу контента.
 */

// ============================================================================
// ID достижений
// ============================================================================

/**
 * ID всех достижений
 */
export enum AchievementId {
  // === Первые шаги ===
  FIRST_SEED = 'FIRST_SEED',

  // === Upload milestones ===
  UPLOAD_1GB = 'UPLOAD_1GB',
  UPLOAD_10GB = 'UPLOAD_10GB',
  UPLOAD_100GB = 'UPLOAD_100GB',
  UPLOAD_1TB = 'UPLOAD_1TB',

  // === Время раздачи ===
  SEED_24H = 'SEED_24H',
  SEED_7D = 'SEED_7D',
  SEED_30D = 'SEED_30D',
  SEED_100D = 'SEED_100D',

  // === Помощь пирам ===
  HELP_10_PEERS = 'HELP_10_PEERS',
  HELP_100_PEERS = 'HELP_100_PEERS',
  HELP_1000_PEERS = 'HELP_1000_PEERS',

  // === Ratio ===
  RATIO_2X = 'RATIO_2X',
  RATIO_5X = 'RATIO_5X',
  RATIO_10X = 'RATIO_10X',

  // === Уникальный контент ===
  CONTENT_10 = 'CONTENT_10',
  CONTENT_50 = 'CONTENT_50',
  CONTENT_100 = 'CONTENT_100',

  // === Ранги (автоматические) ===
  RANK_CONTRIBUTOR = 'RANK_CONTRIBUTOR',
  RANK_REGULAR = 'RANK_REGULAR',
  RANK_VETERAN = 'RANK_VETERAN',
  RANK_LEGEND = 'RANK_LEGEND',
}

// ============================================================================
// Типы достижений
// ============================================================================

/**
 * Уровень достижения (определяет цвет и редкость)
 */
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum'

/**
 * Тип условия достижения
 */
export type AchievementConditionType =
  'upload_bytes' | 'seeding_time' | 'peers_helped' | 'ratio' | 'unique_content' | 'rank' | 'first_seed'

/**
 * Условие достижения
 */
export interface AchievementCondition {
  /** Тип условия */
  type: AchievementConditionType
  /** Целевое значение */
  target: number | string
}

/**
 * Определение достижения
 */
export interface Achievement {
  /** ID достижения */
  id: AchievementId
  /** Название */
  name: string
  /** Описание */
  description: string
  /** Иконка (emoji) */
  icon: string
  /** Уровень */
  tier: AchievementTier
  /** Награда в бонусных очках */
  bonusReward: number
  /** Условие получения */
  condition: AchievementCondition
}

/**
 * Разблокированное достижение пользователя
 */
export interface UserAchievement {
  /** ID достижения */
  id: AchievementId
  /** Дата получения (ISO string) */
  unlockedAt: string
  /** Было ли показано уведомление */
  notified: boolean
}

/**
 * Достижения пользователя
 */
export interface UserAchievements {
  /** Разблокированные достижения */
  unlocked: UserAchievement[]
  /** Прогресс по достижениям (0-100%) */
  progress: Partial<Record<AchievementId, number>>
}

/**
 * Начальные достижения для нового пользователя
 */
export const INITIAL_USER_ACHIEVEMENTS: UserAchievements = {
  unlocked: [],
  progress: {},
}

// ============================================================================
// Цвета уровней
// ============================================================================

/**
 * Цвета для уровней достижений
 */
export const TIER_COLORS: Record<AchievementTier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#E5E4E2',
}

// ============================================================================
// IPC типы
// ============================================================================

/**
 * Результат операции с достижениями
 */
export interface AchievementsOperationResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * События достижений
 */
export type AchievementsEventType = 'achievements:unlocked' | 'achievements:progress'

/**
 * Payload события разблокировки достижения
 */
export interface AchievementUnlockedEvent {
  achievement: Achievement
  bonusEarned: number
}

/**
 * Достижение с прогрессом для UI
 */
export interface AchievementWithProgress extends Achievement {
  /** Прогресс (0-100) */
  progress: number
  /** Разблокировано ли */
  isUnlocked: boolean
  /** Дата разблокировки */
  unlockedAt: string | null
}
