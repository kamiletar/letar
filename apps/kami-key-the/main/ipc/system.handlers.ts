/**
 * IPC handlers для системной информации
 *
 * system:getVersion — версия приложения
 * system:getLayoutInfo — информация о раскладках
 * system:isAutostartEnabled / system:setAutostart — автозагрузка
 * system:isHotkeyEnabled / system:setHotkeyEnabled — вкл/выкл хоткеев
 */

import { app, ipcMain } from 'electron'
import type { LayoutInfo } from '../../shared/ipc-types'
import { getConfig, isHotkeyEnabled, setHotkeyEnabled } from '../background'

export function registerSystemHandlers(): void {
  ipcMain.handle('system:getVersion', (): string => {
    return app.getVersion()
  })

  ipcMain.handle('system:getLayoutInfo', (): LayoutInfo => {
    const config = getConfig()
    return {
      name: config.activeLayout,
      count: config.layouts.length,
    }
  })

  ipcMain.handle('system:isAutostartEnabled', (): boolean => {
    return app.getLoginItemSettings().openAtLogin
  })

  ipcMain.handle('system:setAutostart', (_event, on: boolean): void => {
    app.setLoginItemSettings({ openAtLogin: on })
    console.log(`Автозагрузка: ${on ? 'включена' : 'выключена'}`)
  })

  ipcMain.handle('system:isHotkeyEnabled', (): boolean => {
    return isHotkeyEnabled()
  })

  ipcMain.handle('system:setHotkeyEnabled', (_event, on: boolean): void => {
    setHotkeyEnabled(on)
  })
}
