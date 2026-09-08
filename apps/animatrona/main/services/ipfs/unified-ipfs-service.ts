/**
 * UnifiedIPFSService — Обёртка над Kubo RPC Client (WRITE-часть, creator-only)
 *
 * READ-часть (cat/stat/has/hasBlock/safeCat/probeCidAvailable/saveToFile) вынесена в
 * `@letar/ipfs-kubo-core` (`unified-ipfs-read.ts`) — она SHARED и нужна лёгким клиентам
 * (animatrona-ipfs-player и т.п.). Эта половина остаётся в Animatrona, т.к. `repoGc()`
 * завязан на `ImportQueueController` (creator-only очередь импорта).
 *
 * Предоставляет API для записи в IPFS:
 * - addFile, addBytes, addDirectory, createDirectoryFromCids, repoGc
 *
 * Использует kubo-rpc-client для работы с Kubo демоном
 * (либо встроенным, либо IPFS Desktop).
 */

import { createReadStream, promises as fs } from 'fs'
import type { KuboRPCClient } from 'kubo-rpc-client' with { 'resolution-mode': 'import' }
import path from 'path'

import { getKuboService } from '@letar/ipfs-kubo-core'

import type { IpfsAddResult } from '../../../shared/types/ipfs'
import { createModuleLogger } from '../../utils/logger'
import { ImportQueueController } from '../import-queue-controller'

const log = createModuleLogger('UnifiedIPFS')

/**
 * Получить Kubo RPC клиент
 *
 * @throws Error если KuboService не инициализирован
 */
function getClient(): KuboRPCClient {
  return getKuboService().getClient()
}

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
  const client = getClient()
  const { createReadStream } = await import('fs')
  const { stat } = await import('fs/promises')

  const fileName = path.basename(filePath)
  const fileStat = await stat(filePath)

  log.info('Добавляю файл (стриминг)', { fileName, bytes: fileStat.size, pin: opts?.pin ?? true })

  // Стримим файл в IPFS — не загружаем целиком в память.
  // pin=false используется когда CID будет помещён в directoryCid и должен быть indirect.
  const stream = createReadStream(filePath)
  const result = await client.add(stream, {
    progress: onProgress ? (bytes: number) => onProgress(bytes) : undefined,
    pin: opts?.pin ?? true,
  })

  log.info('Файл добавлен', { cid: result.cid.toString() })

  return {
    cid: result.cid.toString(),
    size: Number(result.size),
    path: fileName,
  }
}

/**
 * Добавить байты (Buffer) в IPFS
 *
 * @param content - Buffer с содержимым
 * @returns CID добавленного контента
 */
export async function addBytes(content: Buffer, opts?: { pin?: boolean }): Promise<string> {
  const client = getClient()

  log.info('Добавляю bytes', { bytes: content.length, pin: opts?.pin ?? true })

  // pin=false используется когда CID будет помещён в directoryCid и должен быть indirect.
  const result = await client.add(content, { pin: opts?.pin ?? true })

  log.info('Bytes добавлены', { cid: result.cid.toString() })

  return result.cid.toString()
}

// === Виртуальные директории IPFS ===

/**
 * Элемент виртуальной директории для publish режима
 */
export interface DirEntry {
  /** Имя файла/директории */
  name: string
  /** Тип: файл или директория */
  type: 'file' | 'directory'
  /** CID существующего файла в IPFS (для файлов) */
  cid?: string | null
  /** Контент для новых файлов (index.html, manifest.json) */
  content?: Buffer
  /** Вложенные элементы (для директорий) */
  children?: DirEntry[]
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
export async function createDirectoryFromCids(entries: DirEntry[]): Promise<string> {
  const client = getClient()

  // Kubo использует MFS (Mutable File System) для создания директорий
  // Создаём временную директорию в MFS, добавляем файлы, получаем CID

  const tempPath = `/tmp-dir-${Date.now()}`

  try {
    // Создаём корневую директорию
    await client.files.mkdir(tempPath, { parents: true })

    /**
     * Рекурсивно добавляем элементы в MFS директорию
     */
    async function addEntries(items: DirEntry[], basePath: string): Promise<void> {
      const addedNames = new Set<string>()

      for (const item of items) {
        // Пропускаем дубликаты имён
        if (addedNames.has(item.name)) {
          log.warn('Пропускаю дубликат', { name: item.name })
          continue
        }

        const itemPath = `${basePath}/${item.name}`

        try {
          if (item.type === 'file') {
            if (item.cid) {
              // Ссылка на существующий CID — используем cp
              await client.files.cp(`/ipfs/${item.cid}`, itemPath)
            } else if (item.content) {
              // Новый файл — добавляем контент
              await client.files.write(itemPath, item.content, { create: true })
            } else {
              log.warn('Пропускаю файл без CID/content', { name: item.name })
              continue
            }
          } else if (item.type === 'directory' && item.children) {
            // Создаём поддиректорию
            await client.files.mkdir(itemPath, { parents: true })
            // Рекурсивно добавляем содержимое
            await addEntries(item.children, itemPath)
          }

          addedNames.add(item.name)
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          if (errorMsg.includes('already exists')) {
            log.warn('Путь уже существует, пропускаю', { name: item.name })
          } else {
            throw error
          }
        }
      }
    }

    log.info('Создаю виртуальную директорию', { entryCount: entries.length })

    await addEntries(entries, tempPath)

    // Получаем CID созданной директории
    const statResult = await client.files.stat(tempPath)
    const rootCid = statResult.cid.toString()

    // Удаляем временную директорию из MFS (CID останется в blockstore)
    await client.files.rm(tempPath, { recursive: true })

    log.info('Виртуальная директория создана', { cid: rootCid })

    return rootCid
  } catch (error) {
    // Пытаемся очистить в случае ошибки
    try {
      await client.files.rm(tempPath, { recursive: true })
    } catch {
      // Игнорируем ошибку очистки
    }
    throw error
  }
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
  const client = getClient()
  const results: IpfsAddResult[] = []

  log.info('Добавляю директорию', { dirPath })

  // Собираем файлы
  const files = await collectFiles(dirPath, recursive)

  // Используем addAll для добавления всей директории с сохранением структуры
  const entries = files.map((f) => ({
    path: f.relativePath,
    content: createReadStream(f.absolutePath),
  }))

  // Добавляем все файлы
  let rootCid = ''
  for await (const result of client.addAll(entries, { wrapWithDirectory: true })) {
    if (result.path === '') {
      // Это корневая директория
      rootCid = result.cid.toString()
    } else {
      results.push({
        cid: result.cid.toString(),
        size: Number(result.size),
        path: result.path,
      })
    }
  }

  log.info('Директория добавлена', { fileCount: results.length, rootCid })

  return { files: results, rootCid }
}

/**
 * Запустить Garbage Collection — удалить неиспользуемые блоки из хранилища
 *
 * @returns Количество удалённых блоков и освобождённый размер
 */
export async function repoGc(): Promise<{ blocksRemoved: number }> {
  // Гейт: во время активного импорта суб-документы заливаются с pin:false в расчёте на
  // будущую indirect-защиту через directoryCid, который ещё не собран и не сохранён в БД —
  // в этом окне такой контент не защищён вообще ничем, и голый repo.gc() удалит его
  // безвозвратно. См. тот же гейт в normalizeAllPins() (pin-normalizer.ts).
  if (ImportQueueController.getInstance().hasActiveImport()) {
    throw new Error('Garbage Collection недоступен во время активного импорта — дождитесь завершения очереди')
  }

  const client = getClient()

  log.info('Запускаю Garbage Collection...')

  let blocksRemoved = 0
  for await (const result of client.repo.gc()) {
    if (result.err) {
      log.debug('GC пропустил блок', { error: String(result.err) })
    } else {
      blocksRemoved++
    }
  }

  log.info('GC завершён', { blocksRemoved })
  return { blocksRemoved }
}

// === Вспомогательные функции ===

interface FileEntry {
  absolutePath: string
  relativePath: string
}

/**
 * Рекурсивно собрать все файлы в директории
 */
async function collectFiles(dirPath: string, recursive: boolean): Promise<FileEntry[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const files: FileEntry[] = []

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name)

    if (entry.isFile()) {
      files.push({
        absolutePath,
        relativePath: entry.name,
      })
    } else if (entry.isDirectory() && recursive) {
      const subFiles = await collectFiles(absolutePath, recursive)
      for (const subFile of subFiles) {
        files.push({
          absolutePath: subFile.absolutePath,
          relativePath: path.join(entry.name, subFile.relativePath),
        })
      }
    }
  }

  return files
}
