/**
 * Reputation Store — Персистентное хранилище репутации пользователя
 *
 * Хранит репутацию в JSON файле в userData директории (main process).
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

import { INITIAL_USER_REPUTATION, type UserReputation } from '../../../shared/types/reputation'
import { createModuleLogger } from '../../utils/logger'

const log = createModuleLogger('ReputationStore')

const REPUTATION_FILE = 'user-reputation.json'

/**
 * Получить путь к файлу репутации
 */
function getReputationPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, REPUTATION_FILE)
}

/**
 * Загрузить репутацию из файла
 */
export function loadReputation(): UserReputation {
  try {
    const filePath = getReputationPath()
    if (!fs.existsSync(filePath)) {
      return { ...INITIAL_USER_REPUTATION }
    }
    const data = fs.readFileSync(filePath, 'utf-8')
    const reputation = JSON.parse(data) as UserReputation

    // Миграция: добавляем недостающие поля
    return {
      ...INITIAL_USER_REPUTATION,
      ...reputation,
    }
  } catch (error) {
    log.error('Ошибка загрузки репутации', { error })
    return { ...INITIAL_USER_REPUTATION }
  }
}

/**
 * Сохранить репутацию в файл
 */
export function saveReputation(reputation: UserReputation): void {
  try {
    const filePath = getReputationPath()
    fs.writeFileSync(filePath, JSON.stringify(reputation, null, 2), 'utf-8')
  } catch (error) {
    log.error('Ошибка сохранения репутации', { error })
    throw error
  }
}

/**
 * Сбросить репутацию (для тестов)
 */
export function resetReputation(): UserReputation {
  const reputation = { ...INITIAL_USER_REPUTATION }
  saveReputation(reputation)
  log.info('Репутация сброшена')
  return reputation
}
