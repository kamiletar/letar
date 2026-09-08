/**
 * Achievements Store — Персистентное хранилище достижений пользователя
 *
 * Хранит достижения в JSON файле в userData директории (main process).
 */

import { createJsonStore } from '@letar/electron-storage'

import { createModuleLogger } from '../../utils/logger'

import {
  type AchievementId,
  INITIAL_USER_ACHIEVEMENTS,
  type UserAchievement,
  type UserAchievements,
} from '../../../shared/types/achievements'

const ACHIEVEMENTS_FILE = 'user-achievements.json'
const log = createModuleLogger('AchievementsStore')

/**
 * In-memory кэш — читаем файл один раз, дальше работаем с памятью.
 *
 * Собственный кэш модуля, не `cacheTtlMs` стора: у store'а он выключен
 * (значение по умолчанию 0), а `saveAchievements` намеренно кладёт значение
 * в кэш ДО попытки записи на диск — если запись упадёт, в памяти всё равно
 * останется новое значение (оригинальная оптимистичная семантика).
 */
let cache: UserAchievements | null = null

const achievementsStore = createJsonStore<UserAchievements>(ACHIEVEMENTS_FILE, INITIAL_USER_ACHIEVEMENTS, {
  mergeDefaults: true,
  logger: log,
})

/**
 * Загрузить достижения (из кэша или файла)
 */
export async function loadAchievements(): Promise<UserAchievements> {
  if (cache) {
    return cache
  }
  cache = await achievementsStore.load()
  return cache
}

/**
 * Сохранить достижения в файл (async, обновляет кэш)
 */
export async function saveAchievements(achievements: UserAchievements): Promise<void> {
  cache = achievements
  await achievementsStore.save(achievements)
}

/**
 * Проверить, разблокировано ли достижение
 */
export async function isAchievementUnlocked(id: AchievementId): Promise<boolean> {
  const achievements = await loadAchievements()
  return achievements.unlocked.some((a) => a.id === id)
}

/**
 * Разблокировать достижение
 */
export async function unlockAchievement(id: AchievementId): Promise<UserAchievement> {
  const achievements = await loadAchievements()

  // Проверяем, не разблокировано ли уже
  if (achievements.unlocked.some((a) => a.id === id)) {
    throw new Error(`Achievement ${id} already unlocked`)
  }

  const achievement: UserAchievement = {
    id,
    unlockedAt: new Date().toISOString(),
    notified: false,
  }

  achievements.unlocked.push(achievement)
  await saveAchievements(achievements)

  log.info('Разблокировано достижение', { id })
  return achievement
}

/**
 * Обновить прогресс достижения
 */
export async function updateProgress(id: AchievementId, progress: number): Promise<void> {
  const achievements = await loadAchievements()

  // Ограничиваем 0-100
  const clampedProgress = Math.min(100, Math.max(0, progress))
  achievements.progress[id] = clampedProgress

  await saveAchievements(achievements)
}

/**
 * Отметить достижение как показанное
 */
export async function markAsNotified(id: AchievementId): Promise<void> {
  const achievements = await loadAchievements()
  const achievement = achievements.unlocked.find((a) => a.id === id)

  if (achievement) {
    achievement.notified = true
    await saveAchievements(achievements)
  }
}

/**
 * Получить непоказанные достижения
 */
export async function getUnnotifiedAchievements(): Promise<UserAchievement[]> {
  const achievements = await loadAchievements()
  return achievements.unlocked.filter((a) => !a.notified)
}

/**
 * Сбросить достижения (для тестов)
 */
export async function resetAchievements(): Promise<UserAchievements> {
  const achievements = { ...INITIAL_USER_ACHIEVEMENTS }
  await saveAchievements(achievements)
  log.info('Достижения сброшены')
  return achievements
}
