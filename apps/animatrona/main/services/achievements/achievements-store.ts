/**
 * Achievements Store — Персистентное хранилище достижений пользователя
 *
 * Хранит достижения в JSON файле в userData директории (main process).
 */

import { app } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import * as path from 'path'

import { createModuleLogger } from '../../utils/logger'

import {
  type AchievementId,
  INITIAL_USER_ACHIEVEMENTS,
  type UserAchievement,
  type UserAchievements,
} from '../../../shared/types/achievements'

const ACHIEVEMENTS_FILE = 'user-achievements.json'
const log = createModuleLogger('AchievementsStore')

/** In-memory кэш — читаем файл один раз, дальше работаем с памятью */
let cache: UserAchievements | null = null

/**
 * Получить путь к файлу достижений
 */
function getAchievementsPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, ACHIEVEMENTS_FILE)
}

/**
 * Загрузить достижения (из кэша или файла)
 */
export async function loadAchievements(): Promise<UserAchievements> {
  if (cache) {
    return cache
  }
  try {
    const filePath = getAchievementsPath()
    const data = await readFile(filePath, 'utf-8')
    const achievements = JSON.parse(data) as UserAchievements

    // Миграция: добавляем недостающие поля
    cache = {
      ...INITIAL_USER_ACHIEVEMENTS,
      ...achievements,
    }
    return cache
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      log.error('Ошибка загрузки достижений', { error })
    }
    cache = { ...INITIAL_USER_ACHIEVEMENTS }
    return cache
  }
}

/**
 * Сохранить достижения в файл (async, обновляет кэш)
 */
export async function saveAchievements(achievements: UserAchievements): Promise<void> {
  cache = achievements
  try {
    const filePath = getAchievementsPath()
    await writeFile(filePath, JSON.stringify(achievements, null, 2), 'utf-8')
  } catch (error) {
    log.error('Ошибка сохранения достижений', { error })
    throw error
  }
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
