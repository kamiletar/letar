/**
 * Торрент-сервис — публичное API
 *
 * Использует qBittorrent Web API как единственный бэкенд.
 * Пользователь устанавливает qBittorrent локально и включает Web UI.
 * Настройки подключения — в Settings → Торрент.
 */

import { createModuleLogger } from '../../utils/logger'
import { QBittorrentService } from './qbittorrent-service'
import type { TorrentServiceInterface } from './torrent-service-interface'

const log = createModuleLogger('TorrentFactory')

export { QBittorrentService } from './qbittorrent-service'
export type { TorrentImportStatus, TorrentMetaUpdate, TorrentServiceInterface } from './torrent-service-interface'
export type { AddTorrentOptions, TorrentEvents, TorrentFileInfo, TorrentInfo, TorrentStatus } from './types'

/** Кэшированный singleton */
let cachedService: TorrentServiceInterface | null = null

/**
 * Получить торрент-сервис (singleton).
 *
 * Возвращает QBittorrentService. Перед первым использованием нужно вызвать
 * initTorrentService() — он подключается к qBittorrent и запускает polling.
 */
export function getTorrentService(): TorrentServiceInterface {
  if (!cachedService) {
    cachedService = QBittorrentService.getInstance()
  }
  return cachedService
}

/**
 * Инициализировать торрент-сервис.
 *
 * Должна вызываться при старте приложения ПОСЛЕ применения миграций.
 * Идемпотентна — повторные вызовы безопасны (init() внутри сервиса
 * проверяет флаг initialized).
 */
export async function initTorrentService(): Promise<TorrentServiceInterface> {
  const service = getTorrentService()
  try {
    await service.init()
  } catch (error) {
    log.error('Ошибка инициализации qBittorrent бэкенда', { error: String(error) })
    throw error
  }
  return service
}

/**
 * Сбросить кэш (для тестов или при смене настроек qBittorrent).
 */
export async function resetTorrentService(): Promise<void> {
  if (cachedService) {
    try {
      await cachedService.destroy()
    } catch {
      /* ignore */
    }
    cachedService = null
  }
}
