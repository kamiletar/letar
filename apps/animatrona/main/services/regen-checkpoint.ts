/**
 * Чекпоинт регенерации манифестов
 *
 * Сохраняет время старта запуска в userData/regen-checkpoint.json.
 * При возобновлении — пропускаем аниме где lastHealthCheckAt >= startedAt.
 */

import { createJsonStore } from '@letar/electron-storage'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('RegenCheckpoint')

export interface RegenCheckpointData {
  /** Время старта текущего запуска (ISO). null = нет активного чекпоинта */
  startedAt: string | null
  /** Общее количество аниме на старте (для UI: "X из Y осталось") */
  total: number
}

export const regenCheckpointStore = createJsonStore<RegenCheckpointData>(
  'regen-checkpoint.json',
  {
    startedAt: null,
    total: 0,
  },
  { mergeDefaults: true, logger: log },
)
