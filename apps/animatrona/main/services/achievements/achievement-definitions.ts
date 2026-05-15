/**
 * Achievement Definitions — Определения всех достижений
 *
 * Центральное место для всех достижений с условиями и наградами.
 */

import { type Achievement, AchievementId } from '../../../shared/types/achievements'

/**
 * Константы для условий (в байтах)
 */
const GB = 1024 * 1024 * 1024
const TB = 1024 * GB

/**
 * Константы для времени (в миллисекундах)
 */
const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

/**
 * Все достижения
 */
export const ACHIEVEMENTS: Achievement[] = [
  // === Первые шаги ===
  {
    id: AchievementId.FIRST_SEED,
    name: 'Первый сид',
    description: 'Начните раздавать контент',
    icon: '🌱',
    tier: 'bronze',
    bonusReward: 10,
    condition: { type: 'first_seed', target: 1 },
  },

  // === Upload milestones ===
  {
    id: AchievementId.UPLOAD_1GB,
    name: 'Гигабайт отдачи',
    description: 'Раздайте 1 GB контента',
    icon: '📤',
    tier: 'bronze',
    bonusReward: 50,
    condition: { type: 'upload_bytes', target: 1 * GB },
  },
  {
    id: AchievementId.UPLOAD_10GB,
    name: '10 гигабайт',
    description: 'Раздайте 10 GB контента',
    icon: '📦',
    tier: 'silver',
    bonusReward: 200,
    condition: { type: 'upload_bytes', target: 10 * GB },
  },
  {
    id: AchievementId.UPLOAD_100GB,
    name: 'Сотня гигабайт',
    description: 'Раздайте 100 GB контента',
    icon: '🏆',
    tier: 'gold',
    bonusReward: 1000,
    condition: { type: 'upload_bytes', target: 100 * GB },
  },
  {
    id: AchievementId.UPLOAD_1TB,
    name: 'Терабайт отдачи',
    description: 'Раздайте 1 TB контента',
    icon: '💎',
    tier: 'platinum',
    bonusReward: 5000,
    condition: { type: 'upload_bytes', target: 1 * TB },
  },

  // === Время раздачи ===
  {
    id: AchievementId.SEED_24H,
    name: 'Сутки раздачи',
    description: 'Раздавайте контент 24 часа',
    icon: '⏰',
    tier: 'bronze',
    bonusReward: 100,
    condition: { type: 'seeding_time', target: 24 * HOUR },
  },
  {
    id: AchievementId.SEED_7D,
    name: 'Неделя раздачи',
    description: 'Раздавайте контент 7 дней',
    icon: '📅',
    tier: 'silver',
    bonusReward: 500,
    condition: { type: 'seeding_time', target: 7 * DAY },
  },
  {
    id: AchievementId.SEED_30D,
    name: 'Месяц раздачи',
    description: 'Раздавайте контент 30 дней',
    icon: '🗓️',
    tier: 'gold',
    bonusReward: 2000,
    condition: { type: 'seeding_time', target: 30 * DAY },
  },
  {
    id: AchievementId.SEED_100D,
    name: 'Сто дней раздачи',
    description: 'Раздавайте контент 100 дней',
    icon: '🎖️',
    tier: 'platinum',
    bonusReward: 5000,
    condition: { type: 'seeding_time', target: 100 * DAY },
  },

  // === Помощь пирам ===
  {
    id: AchievementId.HELP_10_PEERS,
    name: 'Помощник',
    description: 'Помогите 10 пирам',
    icon: '🤝',
    tier: 'bronze',
    bonusReward: 50,
    condition: { type: 'peers_helped', target: 10 },
  },
  {
    id: AchievementId.HELP_100_PEERS,
    name: 'Добрый самаритянин',
    description: 'Помогите 100 пирам',
    icon: '💪',
    tier: 'silver',
    bonusReward: 300,
    condition: { type: 'peers_helped', target: 100 },
  },
  {
    id: AchievementId.HELP_1000_PEERS,
    name: 'Легенда сообщества',
    description: 'Помогите 1000 пирам',
    icon: '🌟',
    tier: 'gold',
    bonusReward: 2000,
    condition: { type: 'peers_helped', target: 1000 },
  },

  // === Ratio ===
  {
    id: AchievementId.RATIO_2X,
    name: 'Ratio 2x',
    description: 'Достигните ratio 2.0',
    icon: '⚖️',
    tier: 'bronze',
    bonusReward: 100,
    condition: { type: 'ratio', target: 2 },
  },
  {
    id: AchievementId.RATIO_5X,
    name: 'Ratio 5x',
    description: 'Достигните ratio 5.0',
    icon: '🔥',
    tier: 'silver',
    bonusReward: 500,
    condition: { type: 'ratio', target: 5 },
  },
  {
    id: AchievementId.RATIO_10X,
    name: 'Ratio 10x',
    description: 'Достигните ratio 10.0',
    icon: '💫',
    tier: 'gold',
    bonusReward: 2000,
    condition: { type: 'ratio', target: 10 },
  },

  // === Уникальный контент ===
  {
    id: AchievementId.CONTENT_10,
    name: 'Коллекционер',
    description: 'Раздавайте 10 уникальных контентов',
    icon: '📚',
    tier: 'bronze',
    bonusReward: 50,
    condition: { type: 'unique_content', target: 10 },
  },
  {
    id: AchievementId.CONTENT_50,
    name: 'Библиотекарь',
    description: 'Раздавайте 50 уникальных контентов',
    icon: '🏛️',
    tier: 'silver',
    bonusReward: 300,
    condition: { type: 'unique_content', target: 50 },
  },
  {
    id: AchievementId.CONTENT_100,
    name: 'Архивариус',
    description: 'Раздавайте 100 уникальных контентов',
    icon: '📜',
    tier: 'gold',
    bonusReward: 1000,
    condition: { type: 'unique_content', target: 100 },
  },

  // === Ранги ===
  {
    id: AchievementId.RANK_CONTRIBUTOR,
    name: 'Контрибьютор',
    description: 'Достигните ранга Контрибьютор',
    icon: '🌿',
    tier: 'bronze',
    bonusReward: 100,
    condition: { type: 'rank', target: 'CONTRIBUTOR' },
  },
  {
    id: AchievementId.RANK_REGULAR,
    name: 'Постоянный',
    description: 'Достигните ранга Постоянный',
    icon: '⭐',
    tier: 'silver',
    bonusReward: 500,
    condition: { type: 'rank', target: 'REGULAR' },
  },
  {
    id: AchievementId.RANK_VETERAN,
    name: 'Ветеран',
    description: 'Достигните ранга Ветеран',
    icon: '💎',
    tier: 'gold',
    bonusReward: 2000,
    condition: { type: 'rank', target: 'VETERAN' },
  },
  {
    id: AchievementId.RANK_LEGEND,
    name: 'Легенда',
    description: 'Достигните ранга Легенда',
    icon: '👑',
    tier: 'platinum',
    bonusReward: 10000,
    condition: { type: 'rank', target: 'LEGEND' },
  },
]

/**
 * Получить достижение по ID
 */
export function getAchievementById(id: AchievementId): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

/**
 * Получить все достижения определённого уровня
 */
export function getAchievementsByTier(tier: Achievement['tier']): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.tier === tier)
}
