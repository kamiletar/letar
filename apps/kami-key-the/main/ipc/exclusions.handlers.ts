/**
 * IPC handlers для управления исключениями
 *
 * exclusions:getList — текущий список исключённых процессов
 * exclusions:saveList — сохранить список исключений
 * exclusions:getForegroundProcess — определить foreground-процесс
 */

import { ipcMain } from 'electron'
import { getExcludedProcesses, getForegroundProcessName } from '../../src/exclusions'
import { applyConfig, getConfig } from '../background'

export function registerExclusionsHandlers(): void {
  ipcMain.handle('exclusions:getList', (): string[] => {
    return getExcludedProcesses()
  })

  ipcMain.handle('exclusions:saveList', (_event, processes: string[]): void => {
    const config = getConfig()
    applyConfig({ ...config, excludedProcesses: processes })
    console.log(`Исключения обновлены: ${processes.length} процессов`)
  })

  ipcMain.handle('exclusions:getForegroundProcess', (): string => {
    return getForegroundProcessName()
  })
}
