/**
 * IPC handlers для торрент-клиента
 */

import type { AddTorrentOptions } from '../services/torrent'
import { getTorrentService, initTorrentService } from '../services/torrent'
import { QBittorrentClient } from '../services/torrent/qbittorrent-client'
import { createHandler } from '../utils/ipc-handler-factory'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('TorrentHandlers')

/**
 * Регистрирует IPC handlers для торрент-клиента
 */
export function registerTorrentHandlers(): void {
  // Инициализация клиента (через фабрику с учётом Settings.torrentBackend)
  createHandler('torrent:init', async () => {
    await initTorrentService()
    return true
  })

  // Добавить торрент по магнет-ссылке
  createHandler('torrent:add', async (magnetURI: string, options: AddTorrentOptions) => {
    // initTorrentService() инициализирует правильный бэкенд при первом вызове
    const service = await initTorrentService()
    return service.add(magnetURI, options)
  })

  // Приостановить торрент
  createHandler('torrent:pause', (infoHash: string) => {
    return getTorrentService().pause(infoHash)
  })

  // Возобновить торрент
  createHandler('torrent:resume', (infoHash: string) => {
    return getTorrentService().resume(infoHash)
  })

  // Удалить торрент
  createHandler('torrent:remove', async (infoHash: string, deleteFiles?: boolean) => {
    return getTorrentService().remove(infoHash, deleteFiles)
  })

  // Информация об одном торренте (автоинициализация клиента)
  createHandler('torrent:get', async (infoHash: string) => {
    const service = await initTorrentService()
    return service.get(infoHash)
  })

  // Список всех торрентов (автоинициализация клиента)
  createHandler('torrent:getAll', async () => {
    const service = await initTorrentService()
    return service.getAll()
  })

  // Получить список файлов торрента через qBittorrent API
  createHandler('torrent:getFiles', async (infoHash: string) => {
    const service = getTorrentService() as import('../services/torrent/qbittorrent-service').QBittorrentService
    return service.getTorrentFiles(infoHash)
  })

  // Обновить метаданные торрента (importStatus, isBundle и т.д.)
  createHandler(
    'torrent:updateMeta',
    (infoHash: string, update: { importStatus?: string; isBundle?: boolean; bundleAnimesJson?: string }) => {
      getTorrentService().updateMeta(infoHash, update)
      return true
    }
  )

  // Остановить клиент
  createHandler('torrent:destroy', async () => {
    await getTorrentService().destroy()
    return true
  })

  // Пересчитать хеш торрента (recheck / force verify)
  createHandler('torrent:recheck', async (infoHash: string) => {
    const service = await initTorrentService()
    return service.recheck(infoHash)
  })

  // Обновить статус импорта торрента
  createHandler('torrent:setImportStatus', (infoHash: string, importStatus: 'none' | 'queued' | 'imported') => {
    getTorrentService().updateMeta(infoHash, { importStatus })
    return true
  })

  // Проверить подключение к qBittorrent (без побочных эффектов)
  // Используется в Settings UI для кнопки «Проверить подключение».
  createHandler(
    'qbittorrent:testConnection',
    async (config: {
      url: string
      username: string
      password: string
    }): Promise<{ success: boolean; version?: string; error?: string }> => {
      const client = new QBittorrentClient()
      try {
        await client.login(config)
        const version = await client.getVersion()
        log.info('qbittorrent:testConnection success', { version })
        return { success: true, version }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        log.warn('qbittorrent:testConnection failed', { error: message })
        return { success: false, error: message }
      }
    }
  )
}
