/**
 * ImportIpfsService — прямые IPFS операции для import-service
 *
 * Заменяет renderer'ный uploadToIpfs() (IPC bridge) на прямые вызовы UnixFSService.
 * Работает в main process — никакого IPC overhead.
 */

import { createModuleLogger } from '../../utils/logger'
import { addFile } from '../ipfs/unixfs-service'

const log = createModuleLogger('ImportIPFS')

/**
 * Модульный коллектор CID — собирает все загруженные CID за время импорта.
 * ImportService вызывает startCidTracking() / getTrackedCids() / stopCidTracking()
 * для управления жизненным циклом. При ошибке — собранные CID используются для cleanup (unpin).
 */
let activeCidCollector: Set<string> | null = null

/** Начать сбор CID (вызывается перед началом импорта) */
export function startCidTracking(): void {
  activeCidCollector = new Set()
}

/** Получить собранные CID */
export function getTrackedCids(): Set<string> {
  return activeCidCollector ?? new Set()
}

/** Остановить сбор CID (вызывается после завершения/ошибки импорта) */
export function stopCidTracking(): void {
  activeCidCollector = null
}

/**
 * Загрузить файл в IPFS
 *
 * @param filePath — путь к файлу на диске
 * @returns {cid, size} или null при ошибке
 */
export async function uploadToIpfs(filePath: string): Promise<{ cid: string; size: number } | null> {
  try {
    const result = await addFile(filePath)
    activeCidCollector?.add(result.cid)
    return { cid: result.cid, size: result.size }
  } catch (error) {
    log.error('Ошибка загрузки в IPFS', { filePath, error: String(error) })
    return null
  }
}

/**
 * Загрузить несколько файлов в IPFS параллельно
 */
export async function uploadManyToIpfs(filePaths: string[]): Promise<Array<{ cid: string; size: number } | null>> {
  return Promise.all(filePaths.map((p) => uploadToIpfs(p)))
}
