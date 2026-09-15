/**
 * IPC handlers для статистики использования символов
 *
 * stats:getTop — топ-N символов по количеству вставок через AltGr
 */

import { ipcMain } from 'electron'
import type { StatEntry } from '../../shared/ipc-types'
import { getTopStats } from '../../src/stats'

export function registerStatsHandlers(): void {
  ipcMain.handle('stats:getTop', (_event, n: number): StatEntry[] => {
    return getTopStats(n)
  })
}
