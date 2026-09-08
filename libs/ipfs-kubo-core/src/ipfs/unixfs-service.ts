/**
 * UnixFS Service — Работа с файлами в IPFS (READ-часть, SHARED)
 *
 * ТЕПЕРЬ ИСПОЛЬЗУЕТ Kubo (Go-IPFS) через UnifiedIPFS (READ-часть, `unified-ipfs-read.ts`)!
 *
 * Этот файл является thin wrapper для обратной совместимости.
 * Read-операции делегируются в unified-ipfs-read.ts, который
 * использует kubo-rpc-client для работы с Kubo демоном.
 *
 * ⚠️ WRITE-операции (addFile/addDirectory/addBytes/createDirectoryFromCids) сюда НЕ входят —
 * они остались в Animatrona (`main/services/ipfs/unified-ipfs-service.ts` +
 * `main/services/ipfs/unixfs-service.ts`), потому что там завязаны на creator-only логику
 * (`ImportQueueController`) и на реальную запись в IPFS, которая нужна только импортёру.
 *
 * Преимущества Kubo:
 * - Стабильный DHT (Go реализация)
 * - Лучший NAT traversal
 * - Автоматический provide в DHT
 */

import type { IpfsStatResult } from '../types/ipfs'
import { createModuleLogger } from '../utils/logger'
import * as UnifiedIPFSRead from './unified-ipfs-read'

const log = createModuleLogger('UnixFS')

/**
 * Прочитать контент по CID (с поддержкой путей внутри директорий)
 *
 * @param cidPath - CID контента или CID/path/to/file для файла в директории
 * @returns Buffer с содержимым
 */
export async function cat(cidPath: string): Promise<Buffer> {
  log.debug('cat → UnifiedIPFS', { cidPath })
  return UnifiedIPFSRead.cat(cidPath)
}

/**
 * Получить статистику по CID (с поддержкой путей внутри директорий)
 *
 * @param cidPath - CID контента или CID/path/to/file для файла в директории
 * @returns Статистика (размер, тип, количество блоков)
 */
export async function stat(cidPath: string): Promise<IpfsStatResult> {
  log.debug('stat → UnifiedIPFS', { cidPath })
  return UnifiedIPFSRead.stat(cidPath)
}

/**
 * Проверить наличие контента локально
 *
 * @param cidString - CID контента
 * @returns true если контент доступен локально
 */
export async function has(cidString: string): Promise<boolean> {
  return UnifiedIPFSRead.hasBlock(cidString)
}

/**
 * Сохранить контент из IPFS в файл
 *
 * @param cidString - CID контента
 * @param outputPath - Путь для сохранения
 */
export async function saveToFile(cidString: string, outputPath: string): Promise<void> {
  return UnifiedIPFSRead.saveToFile(cidString, outputPath)
}
