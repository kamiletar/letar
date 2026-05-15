/**
 * Preload — Геймификация
 *
 * Статистика, репутация, достижения и бонусные очки.
 */

import { ipcRenderer } from 'electron'
import type {
  AchievementUnlockedEvent,
  AchievementWithProgress,
  UserAchievements,
} from '../../shared/types/achievements'
import type { BonusPoints, BonusTransaction } from '../../shared/types/bonus-points'
import type { RankChangedEvent, UserReputation } from '../../shared/types/reputation'
import type { DailyStats, StatsUpdatedEvent, UserStats } from '../../shared/types/stats'
import { on } from './ipc-helper'

/** Stats — Статистика пользователя */
export const statsPreload = {
  /** Получить текущую статистику */
  get: (): Promise<{ success: boolean; data?: UserStats; error?: string }> => ipcRenderer.invoke('stats:get'),

  /** Получить историю по дням */
  getDailyHistory: (days?: number): Promise<{ success: boolean; data?: DailyStats[]; error?: string }> =>
    ipcRenderer.invoke('stats:getDailyHistory', days),

  /** Сбросить статистику (для тестов) */
  reset: (): Promise<{ success: boolean; data?: UserStats; error?: string }> => ipcRenderer.invoke('stats:reset'),

  /** Получить время текущей сессии */
  getCurrentSession: (): Promise<{
    success: boolean
    data?: { durationMs: string; isActive: boolean }
    error?: string
  }> => ipcRenderer.invoke('stats:getCurrentSession'),

  /** Подписка на обновление статистики */
  onUpdated: on<[StatsUpdatedEvent]>('stats:updated'),

  /** Подписка на начало сессии */
  onSessionStarted: on<[]>('stats:sessionStarted'),

  /** Подписка на завершение сессии */
  onSessionEnded: on<[]>('stats:sessionEnded'),
}

/** Reputation — Репутация пользователя */
export const reputationPreload = {
  /** Получить текущую репутацию */
  get: (): Promise<{ success: boolean; data?: UserReputation; error?: string }> => ipcRenderer.invoke('reputation:get'),

  /** Пересчитать репутацию */
  recalculate: (): Promise<{ success: boolean; data?: UserReputation; error?: string }> =>
    ipcRenderer.invoke('reputation:recalculate'),

  /** Сбросить репутацию (для тестов) */
  reset: (): Promise<{ success: boolean; data?: UserReputation; error?: string }> =>
    ipcRenderer.invoke('reputation:reset'),

  /** Получить текущий score */
  getScore: (): Promise<{ success: boolean; data?: number; error?: string }> =>
    ipcRenderer.invoke('reputation:getScore'),

  /** Подписка на обновление репутации */
  onUpdated: on<[UserReputation]>('reputation:updated'),

  /** Подписка на изменение ранга */
  onRankChanged: on<[RankChangedEvent]>('reputation:rankChanged'),
}

/** Achievements — Достижения пользователя */
export const achievementsPreload = {
  /** Получить все достижения с прогрессом */
  getAll: (): Promise<{ success: boolean; data?: AchievementWithProgress[]; error?: string }> =>
    ipcRenderer.invoke('achievements:getAll'),

  /** Получить разблокированные достижения */
  getUnlocked: (): Promise<{ success: boolean; data?: AchievementWithProgress[]; error?: string }> =>
    ipcRenderer.invoke('achievements:getUnlocked'),

  /** Получить данные достижений */
  get: (): Promise<{ success: boolean; data?: UserAchievements; error?: string }> =>
    ipcRenderer.invoke('achievements:get'),

  /** Отметить достижение как показанное */
  markNotified: (id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('achievements:markNotified', id),

  /** Проверить все достижения */
  check: (): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('achievements:check'),

  /** Сбросить достижения (для тестов) */
  reset: (): Promise<{ success: boolean; data?: UserAchievements; error?: string }> =>
    ipcRenderer.invoke('achievements:reset'),

  /** Подписка на разблокировку достижения */
  onUnlocked: on<[AchievementUnlockedEvent]>('achievements:unlocked'),

  /** Подписка на обновление прогресса */
  onProgress: on<[{ id: string; progress: number }]>('achievements:progress'),
}

/** Bonus — Бонусные очки */
export const bonusPreload = {
  /** Получить бонусные очки */
  get: (): Promise<{ success: boolean; data?: BonusPoints; error?: string }> => ipcRenderer.invoke('bonus:get'),

  /** Получить баланс */
  getBalance: (): Promise<{ success: boolean; data?: number; error?: string }> =>
    ipcRenderer.invoke('bonus:getBalance'),

  /** Получить историю транзакций */
  getTransactions: (limit?: number): Promise<{ success: boolean; data?: BonusTransaction[]; error?: string }> =>
    ipcRenderer.invoke('bonus:getTransactions', limit),

  /** Потратить очки */
  spend: (
    amount: number,
    description: string,
    metadata?: Record<string, unknown>
  ): Promise<{
    success: boolean
    data?: { success: boolean; error?: string; transaction?: BonusTransaction; newBalance?: number }
    error?: string
  }> => ipcRenderer.invoke('bonus:spend', amount, description, metadata),

  /** Сбросить бонусы (для тестов) */
  reset: (): Promise<{ success: boolean; data?: BonusPoints; error?: string }> => ipcRenderer.invoke('bonus:reset'),

  /** Подписка на изменение баланса */
  onBalanceChanged:
    on<[{ oldBalance: number; newBalance: number; transaction: BonusTransaction }]>('bonus:balanceChanged'),

  /** Подписка на заработок очков */
  onPointsEarned: on<[{ amount: number; type: string; description: string }]>('bonus:pointsEarned'),

  /** Подписка на трату очков */
  onPointsSpent: on<[{ amount: number; description: string }]>('bonus:pointsSpent'),
}
