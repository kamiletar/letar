import { ipcMain } from 'electron'
import { getTemplatesPath, getUserDataPath } from '../utils/paths'

/**
 * IPC handlers для конфигурации
 * Настройки хранятся в SQLite через ZenStack (Settings model)
 */
export function registerConfigHandlers(): void {
  // Примечание: Основная работа с настройками происходит через
  // ZenStack API routes в renderer process.
  // Эти handlers для специфичных операций из main process.

  // Получить путь к данным приложения
  ipcMain.handle('config:getDataPath', async () => {
    return getUserDataPath()
  })

  // Получить путь к шаблонам
  ipcMain.handle('config:getTemplatesPath', async () => {
    return getTemplatesPath()
  })
}
