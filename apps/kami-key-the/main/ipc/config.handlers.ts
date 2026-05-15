/**
 * IPC handlers для конфигурации
 *
 * config:get — загрузить текущий конфиг
 * config:save — сохранить + перезагрузить хоткеи + broadcast
 * config:cycleLayout — переключить раскладку
 */

import { ipcMain } from 'electron'
import type { KeymapConfig } from '../../src/types'
import { applyConfig, doCycleLayout, getConfig } from '../background'

export function registerConfigHandlers(): void {
  ipcMain.handle('config:get', (): KeymapConfig => {
    return getConfig()
  })

  ipcMain.handle('config:save', (_event, config: KeymapConfig): void => {
    applyConfig(config)
    console.log('Конфиг обновлён из редактора')
  })

  ipcMain.handle('config:cycleLayout', (): KeymapConfig => {
    return doCycleLayout()
  })
}
