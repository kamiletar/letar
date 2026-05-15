/**
 * Чекпоинт регенерации манифестов
 *
 * Сохраняет время старта запуска в userData/regen-checkpoint.json.
 * При возобновлении — пропускаем аниме где lastHealthCheckAt >= startedAt.
 */

import { createConfigStore } from '../utils/config-store'

export interface RegenCheckpointData {
  /** Время старта текущего запуска (ISO). null = нет активного чекпоинта */
  startedAt: string | null
  /** Общее количество аниме на старте (для UI: "X из Y осталось") */
  total: number
}

export const regenCheckpointStore = createConfigStore<RegenCheckpointData>('regen-checkpoint.json', {
  startedAt: null,
  total: 0,
})
