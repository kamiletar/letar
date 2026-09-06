/**
 * Модуль отслеживания торрентов для очереди импорта
 *
 * Отвечает за удаление исходной раздачи после успешного импорта
 * и за сброс importStatus при ошибке/отмене.
 */

import { createModuleLogger } from '../utils/logger'
import { getTorrentService } from './torrent'

const log = createModuleLogger('ImportQueueTorrent')

/**
 * Удалить исходный торрент после успешного импорта по folderPath.
 * Ищет торрент, у которого downloadPath совпадает с папкой импорта — тот же
 * способ сопоставления, что и у resetTorrentImportStatus ниже.
 *
 * Безопасно вызывать для любого импорта: обычный drag&drop-импорт файлов не
 * имеет соответствующего торрента (folderPath не совпадёт ни с одним `t.path`),
 * поэтому для него функция тихо ничего не делает.
 *
 * Контент уже перекодирован и лежит в локальном Kubo — исходник для этого
 * больше не нужен, удаление безопасно сразу после успешного завершения импорта
 * (см. `apps/animatrona/PLAN.md` § «Дисковая гигиена батча», шаг 1 — тот же
 * вызов `getTorrentService().remove(infoHash, true)`, что использует
 * `cancelDownload()` в `rutracker-download-orchestrator.ts`).
 */
export async function removeTorrentSource(folderPath: string): Promise<void> {
  try {
    const torrentService = getTorrentService()
    const torrents = torrentService.getAll()
    const match = torrents.find((t) => folderPath.startsWith(t.path))
    if (!match) {
      return
    }
    await torrentService.remove(match.infoHash, true)
    log.info('Исходный торрент удалён после успешного импорта', { infoHash: match.infoHash, folderPath })
  } catch (error) {
    // TorrentService может быть не инициализирован, либо торрент уже удалён — не критично
    log.warn('Не удалось удалить исходный торрент после импорта', { folderPath, error: String(error) })
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
