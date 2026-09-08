/**
 * UnifiedIPFS — READ-функции (SHARED, без Prisma-зависимостей)
 *
 * Половина оригинального `unified-ipfs-service.ts` из Animatrona — только чтение контента
 * из Kubo. WRITE-функции (addFile/addBytes/addDirectory/createDirectoryFromCids/repoGc)
 * остались в Animatrona (`main/services/ipfs/unified-ipfs-service.ts`), потому что зависят
 * от creator-only логики (`ImportQueueController`) и не нужны потребителям-плеерам.
 *
 * Использует kubo-rpc-client для работы с Kubo демоном
 * (либо встроенным, либо IPFS Desktop).
 */

import { promises as fs } from 'fs'
import type { KuboRPCClient } from 'kubo-rpc-client' with { 'resolution-mode': 'import' }

import { getKuboService } from '../kubo'
import type { IpfsStatResult } from '../types/ipfs'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('UnifiedIPFS')

/** Ленивая загрузка CID — 'multiformats/cid' ESM-only, недоступен через require() из CJS */
type MultiformatsCid = typeof import('multiformats/cid', { with: { 'resolution-mode': 'import' }})
let cidModulePromise: Promise<MultiformatsCid> | null = null
function getCidCtor(): Promise<MultiformatsCid['CID']> {
  cidModulePromise ??= import('multiformats/cid')
  return cidModulePromise.then((m) => m.CID)
}

/**
 * Получить Kubo RPC клиент
 *
 * @throws Error если KuboService не инициализирован
 */
function getClient(): KuboRPCClient {
  return getKuboService().getClient()
}

/**
 * Парсит строку CID с опциональным путём
 *
 * @param cidPath - CID или CID/path/to/file
 * @returns Объект с CID и опциональным путём
 */
function parseCidPath(cidPath: string): { cid: string; path?: string } {
  const parts = cidPath.split('/')
  const cidString = parts[0]

  if (parts.length > 1) {
    return { cid: cidString, path: parts.slice(1).join('/') }
  }

  return { cid: cidString }
}

/**
 * Прочитать контент по CID (с поддержкой путей внутри директорий)
 *
 * @param cidPath - CID контента или CID/path/to/file для файла в директории
 * @returns Buffer с содержимым
 */
export async function cat(cidPath: string): Promise<Buffer> {
  const client = getClient()
  const { cid, path: filePath } = parseCidPath(cidPath)

  log.debug('Читаю контент', { cidPath })

  // Формируем полный путь для Kubo API
  const fullPath = filePath ? `${cid}/${filePath}` : cid

  const chunks: Uint8Array[] = []
  for await (const chunk of client.cat(fullPath)) {
    chunks.push(chunk)
  }

  const content = Buffer.concat(chunks)
  log.debug('Прочитано', { bytes: content.length })

  return content
}

/**
 * Получить статистику по CID (с поддержкой путей внутри директорий)
 *
 * @param cidPath - CID контента или CID/path/to/file для файла в директории
 * @returns Статистика (размер, тип, количество блоков)
 */
export async function stat(cidPath: string): Promise<IpfsStatResult> {
  const client = getClient()
  const { cid, path: filePath } = parseCidPath(cidPath)

  log.debug('Stat', { cidPath })

  // Формируем полный путь для Kubo API
  const fullPath = filePath ? `${cid}/${filePath}` : cid

  // Kubo files.stat возвращает информацию о файле/директории
  const info = await client.files.stat(`/ipfs/${fullPath}`)

  // Определяем тип
  let type: 'file' | 'directory' | 'raw' = 'file'
  if (info.type === 'directory') {
    type = 'directory'
  } else if (info.type === 'file') {
    type = 'file'
  }

  return {
    cid: cidPath,
    size: Number(info.size),
    blocks: info.blocks,
    cumulativeSize: info.cumulativeSize,
    type,
    local: true, // Kubo хранит данные локально
  }
}

/**
 * Проверить наличие контента локально
 *
 * Использует block.stat() для O(1) проверки вместо перебора всех refs.
 *
 * @param cidString - CID контента
 * @returns true если контент доступен локально
 */
export async function has(cidString: string): Promise<boolean> {
  return hasBlock(cidString)
}

/**
 * Проверить наличие блока по CID (быстрая проверка)
 *
 * @param cidString - CID блока
 * @returns true если блок есть локально
 */
export async function hasBlock(cidString: string): Promise<boolean> {
  try {
    const client = getClient()

    // block.stat возвращает информацию если блок есть
    // Вызывает ошибку если блока нет
    await client.block.stat((await getCidCtor()).parse(cidString))
    return true
  } catch {
    return false
  }
}

/**
 * Прочитать контент с таймаутом — возвращает null при ошибке/таймауте.
 *
 * Используется в anime-directory-builder для устойчивости к потерянным CID:
 * если блок недоступен в DHT/peering за timeoutMs, возвращаем null чтобы вызывающий
 * мог решить что делать (skip / regenerate / re-fetch).
 *
 * @param cidPath - CID или CID/path/to/file
 * @param timeoutMs - таймаут в миллисекундах (по умолчанию 15с)
 * @returns Buffer с контентом или null при таймауте/ошибке
 */
export async function safeCat(cidPath: string, timeoutMs = 15_000): Promise<Buffer | null> {
  const client = getClient()
  const { cid, path: filePath } = parseCidPath(cidPath)
  const fullPath = filePath ? `${cid}/${filePath}` : cid

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const chunks: Uint8Array[] = []
    for await (const chunk of client.cat(fullPath, { signal: controller.signal })) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  } catch (error) {
    log.debug('safeCat: не удалось прочитать', {
      cidPath,
      timeoutMs,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Проверить достижимость CID через сеть с коротким таймаутом.
 *
 * В отличие от `hasBlock`, который ждёт неограниченно (пока DHT lookup не завершится),
 * эта функция возвращает false если блок не достижим за timeoutMs.
 *
 * Использование в builder'е: перед добавлением leaf-CID entry в директорию проверяем
 * доступность блока. Если он мёртв — не добавляем entry (иначе `pin add directoryCid`
 * зависнет на этом блоке).
 *
 * @param cidString - CID для проверки
 * @param timeoutMs - таймаут (по умолчанию 5с)
 * @returns true если блок достижим (локально или у peering-пиров) за timeoutMs
 */
export async function probeCidAvailable(cidString: string, timeoutMs = 5_000): Promise<boolean> {
  const client = getClient()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    await client.block.stat((await getCidCtor()).parse(cidString), { signal: controller.signal })
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Сохранить контент из IPFS в файл
 *
 * @param cidString - CID контента
 * @param outputPath - Путь для сохранения
 */
export async function saveToFile(cidString: string, outputPath: string): Promise<void> {
  const content = await cat(cidString)
  await fs.writeFile(outputPath, content)
  log.info('Сохранено в файл', { outputPath })
}
