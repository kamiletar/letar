/**
 * Модуль отслеживания торрентов для очереди импорта
 *
 * Отвечает только за обновление importStatus торрентов
 * при завершении или отмене импорта.
 */

import { createModuleLogger } from '../utils/logger'
import { getTorrentService } from './torrent'

const log = createModuleLogger('ImportQueueTorrent')

/**
 * Пометить торрент как импортированный по folderPath
 * Ищет торрент, у которого downloadPath совпадает с папкой импорта
 */
export function markTorrentImported(folderPath: string): void {
  try {
    const torrentService = getTorrentService()
    const torrents = torrentService.getAll()
    // Ищем торрент с совпадающим путём
    const match = torrents.find((t) => folderPath.startsWith(t.path))
    if (match) {
      torrentService.updateMeta(match.infoHash, { importStatus: 'imported' })
      log.info('Торрент помечен как импортированный', { infoHash: match.infoHash, folderPath })
    }
  } catch {
    // TorrentService может быть не инициализирован — игнорируем
  }
}

/**
 * Сбросить importStatus торрента на 'none' (при отмене/ошибке)
 */
export function resetTorrentImportStatus(folderPath: string): void {
  try {
    const torrentService = getTorrentService()
    const torrents = torrentService.getAll()
    const match = torrents.find((t) => folderPath.startsWith(t.path))
    if (match && match.importStatus === 'queued') {
      torrentService.updateMeta(match.infoHash, { importStatus: 'none' })
      log.info('importStatus торрента сброшен', { infoHash: match.infoHash, folderPath })
    }
  } catch {
    // TorrentService может быть не инициализирован — игнорируем
  }
}
