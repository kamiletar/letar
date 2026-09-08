/**
 * UnixFS Service — Работа с файлами в IPFS (compat-обёртка Animatrona)
 *
 * ⚠️ Отклонение от буквального плана переноса: этот файл НЕ переехал в `@letar/ipfs-kubo-core`
 * целиком, хотя по объёму он SHARED-код. Причина — он одновременно оборачивает READ-функции
 * (cat/stat/has/saveToFile, теперь живут в либе) и WRITE-функции
 * (addFile/addDirectory/addBytes/createDirectoryFromCids, остались в Animatrona, завязаны на
 * `ImportQueueController`). Перенос файла целиком создал бы обратную зависимость
 * либа→приложение, что архитектурно запрещено. Поэтому файл остался в Animatrona как тонкая
 * объединяющая обёртка над обеими половинами — публичный API (сигнатуры, имена экспортов) не
 * изменился, ни один из 13 потребителей в `apps/animatrona/main/**` править не пришлось.
 *
 * Преимущества Kubo:
 * - Стабильный DHT (Go реализация)
 * - Лучший NAT traversal
 * - Автоматический provide в DHT
 */

import { unixfsCat, unixfsHas, unixfsSaveToFile, unixfsStat } from '@letar/ipfs-kubo-core'

import type { IpfsAddResult, IpfsStatResult } from '../../../shared/types/ipfs'
import { createModuleLogger } from '../../utils/logger'
import * as UnifiedIPFS from './unified-ipfs-service'

const log = createModuleLogger('UnixFS')

// Re-export types from unified service
export type { DirEntry } from './unified-ipfs-service'

/**
 * Добавить файл в IPFS
 *
 * @param filePath - Путь к файлу на диске
 * @param onProgress - Callback для прогресса (опционально)
 * @returns CID и размер добавленного файла
 */
export async function addFile(
  filePath: string,
  onProgress?: (bytes: number) => void,
  opts?: { pin?: boolean },
): Promise<IpfsAddResult> {
  log.info('addFile → UnifiedIPFS', { filePath, pin: opts?.pin ?? true })
  return UnifiedIPFS.addFile(filePath, onProgress, opts)
}

/**
 * Добавить директорию в IPFS
 *
 * @param dirPath - Путь к директории
 * @param recursive - Рекурсивно добавлять поддиректории
 * @returns Массив результатов для каждого файла + корневой CID
 */
export async function addDirectory(
  dirPath: string,
  recursive = true,
): Promise<{ files: IpfsAddResult[]; rootCid: string }> {
  log.info('addDirectory → UnifiedIPFS', { dirPath })
  return UnifiedIPFS.addDirectory(dirPath, recursive)
}

/**
 * Добавить байты (Buffer) в IPFS
 *
 * @param content - Buffer с содержимым
 * @returns CID добавленного контента
 */
export async function addBytes(content: Buffer, opts?: { pin?: boolean }): Promise<string> {
  log.info('addBytes → UnifiedIPFS', { bytes: content.length, pin: opts?.pin ?? true })
  return UnifiedIPFS.addBytes(content, opts)
}

/**
 * Прочитать контент по CID (с поддержкой путей внутри директорий)
 *
 * @param cidPath - CID контента или CID/path/to/file для файла в директории
 * @returns Buffer с содержимым
 */
export async function cat(cidPath: string): Promise<Buffer> {
  log.debug('cat → @letar/ipfs-kubo-core', { cidPath })
  return unixfsCat(cidPath)
}

/**
 * Получить статистику по CID (с поддержкой путей внутри директорий)
 *
 * @param cidPath - CID контента или CID/path/to/file для файла в директории
 * @returns Статистика (размер, тип, количество блоков)
 */
export async function stat(cidPath: string): Promise<IpfsStatResult> {
  log.debug('stat → @letar/ipfs-kubo-core', { cidPath })
  return unixfsStat(cidPath)
}

/**
 * Проверить наличие контента локально
 *
 * @param cidString - CID контента
 * @returns true если контент доступен локально
 */
export async function has(cidString: string): Promise<boolean> {
  return unixfsHas(cidString)
}

/**
 * Сохранить контент из IPFS в файл
 *
 * @param cidString - CID контента
 * @param outputPath - Путь для сохранения
 */
export async function saveToFile(cidString: string, outputPath: string): Promise<void> {
  return unixfsSaveToFile(cidString, outputPath)
}

/**
 * Создать IPFS директорию из существующих CID БЕЗ скачивания
 *
 * Эта функция строит виртуальную директорию в IPFS, используя
 * ссылки на существующие CID вместо скачивания и повторной загрузки файлов.
 *
 * @param entries - Структура директории
 * @returns Root CID созданной директории
 */
export async function createDirectoryFromCids(entries: UnifiedIPFS.DirEntry[]): Promise<string> {
  log.info('createDirectoryFromCids → UnifiedIPFS', { entryCount: entries.length })
  return UnifiedIPFS.createDirectoryFromCids(entries)
}
