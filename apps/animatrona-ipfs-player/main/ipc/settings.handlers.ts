import { ipcMain } from 'electron'
import { getPrismaClient } from '../utils/db'

const SETTINGS_ID = 'default'

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async () => {
    const db = getPrismaClient()
    return db.settings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    })
  })

  ipcMain.handle('settings:update', async (_event, patch: Record<string, unknown>) => {
    const db = getPrismaClient()
    return db.settings.update({ where: { id: SETTINGS_ID }, data: patch })
  })
}
