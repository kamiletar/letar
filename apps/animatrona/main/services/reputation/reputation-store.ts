/**
 * Reputation Store — Персистентное хранилище репутации пользователя
 *
 * Хранит репутацию в JSON файле в userData директории (main process).
 */

import { createJsonStore } from '@letar/electron-storage'

import { INITIAL_USER_REPUTATION, type UserReputation } from '../../../shared/types/reputation'
import { createModuleLogger } from '../../utils/logger'

const log = createModuleLogger('ReputationStore')

const REPUTATION_FILE = 'user-reputation.json'

// mergeDefaults: true воспроизводит прежнее `{ ...INITIAL_USER_REPUTATION, ...reputation }`
const reputationStore = createJsonStore<UserReputation>(REPUTATION_FILE, INITIAL_USER_REPUTATION, {
  mergeDefaults: true,
  logger: log,
})

/**
 * Загрузить репутацию из файла
 */
export function loadReputation(): UserReputation {
  return reputationStore.loadSync()
}

/**
 * Сохранить репутацию в файл
 */
export function saveReputation(reputation: UserReputation): void {
  reputationStore.saveSync(reputation)
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
