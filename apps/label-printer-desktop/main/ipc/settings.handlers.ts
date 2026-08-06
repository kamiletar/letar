/**
 * IPC handlers для настроек приложения
 * Использует SettingsService для работы с SQLite БД
 */
import { Logger } from '@letar/label-printer-core'
import { ipcMain } from 'electron'
import type { AppSettings } from '../../shared/types'
import { settingsService } from '../services/settings.service'

const getLogger = () => Logger.getInstance()

/**
 * IPC handlers для настроек
 */
export function registerSettingsHandlers(): void {
  // Получить настройки
  ipcMain.handle('settings:get', async (): Promise<AppSettings> => {
    const settings = await settingsService.getSettings()
    return settings
  })

  // Сохранить настройки (частичное обновление)
  ipcMain.handle(
    'settings:save',
    async (_event, data: Partial<AppSettings>): Promise<{ success: boolean; error?: string }> => {
      try {
        // Убираем поля, которые не должны обновляться напрямую
        const {
          id: _id,
          updatedAt: _updatedAt,
          ...updateData
        } = data as AppSettings & { id?: string; updatedAt?: Date }
        await settingsService.updateSettings(updateData)
        return { success: true }
      } catch (error) {
        getLogger().error('[SettingsIPC]', 'Failed to save settings', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }
      }
    },
  )
}
