/**
 * IPC handlers для профилей принтеров
 */
import { createJsonStore } from '@letar/electron-storage'
import type { IpcMainInvokeEvent } from 'electron'
import { ipcMain } from 'electron'
import { STORAGE_FILES } from '../../shared/constants'
import type { PrinterProfile } from '../../shared/types'
import { devDataDir } from '../utils/data-dir'
import { jsonStoreLogger, logger } from '../utils/logger-helper'

/** Данные профилей */
interface ProfilesData {
  profiles: PrinterProfile[]
}

/** Хранилище профилей (singleton) */
const profilesStorage = createJsonStore<ProfilesData>(
  STORAGE_FILES.profiles,
  { profiles: [] },
  { dir: devDataDir(), logger: jsonStoreLogger }
)

/**
 * Генерация уникального ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * IPC handlers для профилей принтеров
 */
export function registerProfilesHandlers(): void {
  // Получить список профилей
  ipcMain.handle('profiles:list', async () => {
    try {
      const data = await profilesStorage.load()
      return data.profiles
    } catch (error) {
      logger.error('[ProfilesIPC]', 'profiles:list error', error)
      return []
    }
  })

  // Получить профиль по ID
  ipcMain.handle('profiles:get', async (_event: IpcMainInvokeEvent, id: string) => {
    try {
      const data = await profilesStorage.load()
      return data.profiles.find((p) => p.id === id) || null
    } catch (error) {
      logger.error('[ProfilesIPC]', 'profiles:get error', error)
      return null
    }
  })

  // Создать новый профиль
  ipcMain.handle(
    'profiles:create',
    async (_event: IpcMainInvokeEvent, profile: Omit<PrinterProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
      try {
        const data = await profilesStorage.load()
        const now = new Date().toISOString()
        const newProfile: PrinterProfile = {
          ...profile,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
        }
        data.profiles.push(newProfile)
        await profilesStorage.save(data)
        return { success: true, profile: newProfile }
      } catch (error) {
        logger.error('[ProfilesIPC]', 'profiles:create error', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // Обновить профиль
  ipcMain.handle(
    'profiles:update',
    async (_event: IpcMainInvokeEvent, id: string, updates: Partial<PrinterProfile>) => {
      try {
        const data = await profilesStorage.load()
        const index = data.profiles.findIndex((p) => p.id === id)
        if (index === -1) {
          return { success: false, error: 'Профиль не найден' }
        }
        data.profiles[index] = {
          ...data.profiles[index],
          ...updates,
          id, // ID нельзя менять
          updatedAt: new Date().toISOString(),
        }
        await profilesStorage.save(data)
        return { success: true, profile: data.profiles[index] }
      } catch (error) {
        logger.error('[ProfilesIPC]', 'profiles:update error', error)
        return { success: false, error: String(error) }
      }
    }
  )

  // Удалить профиль
  ipcMain.handle('profiles:delete', async (_event: IpcMainInvokeEvent, id: string) => {
    try {
      const data = await profilesStorage.load()
      const index = data.profiles.findIndex((p) => p.id === id)
      if (index === -1) {
        return { success: false, error: 'Профиль не найден' }
      }
      data.profiles.splice(index, 1)
      await profilesStorage.save(data)
      return { success: true }
    } catch (error) {
      logger.error('[ProfilesIPC]', 'profiles:delete error', error)
      return { success: false, error: String(error) }
    }
  })
}
