/**
 * Pin Manager — Управление закреплённым контентом в IPFS
 *
 * ТЕПЕРЬ ИСПОЛЬЗУЕТ Kubo (Go-IPFS) через kubo-rpc-client!
 *
 * Pinning предотвращает удаление контента сборщиком мусора.
 * Kubo имеет встроенный pinning который сохраняется между перезапусками.
 * Дополнительно метаданные о pins сохраняются в JSON файле.
 */

import { EventEmitter } from 'events'
import { promises as fs } from 'fs'
import { CID } from 'multiformats/cid'
import path from 'path'

import { createModuleLogger } from '../../utils/logger'
import { getKuboService } from '../kubo'
import { getIpfsDataDir } from './peer-id-manager'
import { stat } from './unixfs-service'

const log = createModuleLogger('PinManager')

/** Информация о закреплённом контенте */
export interface PinInfo {
  /** CID контента */
  cid: string
  /** Название (опционально) */
  name?: string
  /** Размер в байтах */
  size: number
  /** Дата закрепления */
  pinnedAt: string
  /** Тип контента */
  type: 'file' | 'directory' | 'raw'
}

/** Статистика pins */
export interface PinStats {
  /** Общее количество pins */
  count: number
  /** Общий размер в байтах */
  totalSize: number
}

/** Структура файла pins.json */
interface PinsData {
  version: 1
  pins: PinInfo[]
}

const PINS_FILE = 'pins.json'

/**
 * Pin Manager
 *
 * Управляет локальными pins через Kubo API с метаданными в JSON файле
 */
export class PinManager extends EventEmitter {
  private static instance: PinManager | null = null
  private pins: Map<string, PinInfo> = new Map()
  private initialized = false

  private constructor() {
    super()
  }

  /** Получить singleton instance */
  static getInstance(): PinManager {
    if (!PinManager.instance) {
      PinManager.instance = new PinManager()
    }
    return PinManager.instance
  }

  /** Инициализация — загрузка pins из файла */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    try {
      const pinsPath = await this.getPinsFilePath()

      if (await this.fileExists(pinsPath)) {
        const data = await fs.readFile(pinsPath, 'utf-8')
        const parsed: PinsData = JSON.parse(data)

        for (const pin of parsed.pins) {
          this.pins.set(pin.cid, pin)
        }

        log.info('Загружено pins', { count: this.pins.size })
      }

      this.initialized = true
    } catch (error) {
      log.error('Ошибка загрузки pins', { error: String(error) })
      this.initialized = true // Продолжаем с пустым списком
    }
  }

  /** Закрепить контент */
  async pin(cid: string, name?: string): Promise<PinInfo> {
    await this.initialize()

    // Проверяем, не закреплён ли уже
    if (this.pins.has(cid)) {
      log.info('CID уже закреплён', { cid })
      return this.pins.get(cid)!
    }

    // Получаем информацию о контенте
    let size = 0
    let type: 'file' | 'directory' | 'raw' = 'raw'

    try {
      const statResult = await stat(cid)
      size = statResult.size
      type = statResult.type
    } catch {
      log.warn('Не удалось получить stat', { cid })
    }

    // Добавляем pin в Kubo
    const kuboService = getKuboService()
    const client = kuboService.getClientOrNull()

    if (client) {
      try {
        const cidObj = CID.parse(cid)
        await client.pin.add(cidObj)
        log.debug('Контент закреплён в Kubo', { cid })
      } catch (error) {
        log.warn('Предупреждение при pin в Kubo', { error: String(error) })
      }
    }

    // Создаём запись
    const pinInfo: PinInfo = {
      cid,
      name,
      size,
      type,
      pinnedAt: new Date().toISOString(),
    }

    this.pins.set(cid, pinInfo)
    await this.save()

    log.info('Закреплён', { cid, name: name || 'без имени' })
    this.emit('pinned', pinInfo)

    return pinInfo
  }

  /** Открепить контент */
  async unpin(cid: string): Promise<boolean> {
    await this.initialize()

    // Всегда пытаемся удалить pin из Kubo (даже если нет в локальном JSON)
    const kuboService = getKuboService()
    const client = kuboService.getClientOrNull()
    let kuboUnpinned = false

    if (client) {
      try {
        const cidObj = CID.parse(cid)
        await client.pin.rm(cidObj)
        kuboUnpinned = true
        log.debug('Pin удалён из Kubo', { cid })
      } catch (error) {
        // "not pinned" — не ошибка, просто CID уже не закреплён
        const msg = String(error)
        if (msg.includes('not pinned')) {
          log.debug('CID уже не закреплён в Kubo', { cid })
        } else {
          log.warn('Ошибка при unpin в Kubo', { error: msg })
        }
      }
    }

    // Удаляем из локального JSON если есть
    const hadLocal = this.pins.has(cid)
    if (hadLocal) {
      const pinInfo = this.pins.get(cid)!
      this.pins.delete(cid)
      await this.save()
      this.emit('unpinned', pinInfo)
    }

    if (kuboUnpinned || hadLocal) {
      log.info('Откреплён', { cid, kubo: kuboUnpinned, local: hadLocal })
      return true
    }

    log.info('CID не был закреплён', { cid })
    return false
  }

  /** Проверить, закреплён ли контент */
  async isPinned(cid: string): Promise<boolean> {
    await this.initialize()
    return this.pins.has(cid)
  }

  /** Получить информацию о pin */
  async getPin(cid: string): Promise<PinInfo | null> {
    await this.initialize()
    return this.pins.get(cid) || null
  }

  /** Список всех pins */
  async listPins(): Promise<PinInfo[]> {
    await this.initialize()
    return Array.from(this.pins.values()).sort(
      (a, b) => new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime()
    )
  }

  /** Статистика pins */
  async getStats(): Promise<PinStats> {
    await this.initialize()

    let totalSize = 0
    for (const pin of this.pins.values()) {
      totalSize += pin.size
    }

    return {
      count: this.pins.size,
      totalSize,
    }
  }

  /** Обновить имя pin */
  async rename(cid: string, name: string): Promise<boolean> {
    await this.initialize()

    const pin = this.pins.get(cid)
    if (!pin) {
      return false
    }

    pin.name = name
    await this.save()

    this.emit('renamed', pin)
    return true
  }

  /** Очистить все pins */
  async clear(): Promise<number> {
    await this.initialize()

    const count = this.pins.size

    // Удаляем все pins из Kubo
    const kuboService = getKuboService()
    const client = kuboService.getClientOrNull()

    if (client) {
      for (const cid of this.pins.keys()) {
        try {
          const cidObj = CID.parse(cid)
          await client.pin.rm(cidObj)
        } catch {
          // Игнорируем ошибки — контент может уже быть не запинен
        }
      }
    }

    this.pins.clear()
    await this.save()

    log.info('Очищено pins', { count })
    this.emit('cleared', count)

    return count
  }

  // === Private методы ===

  /** Путь к файлу pins.json */
  private async getPinsFilePath(): Promise<string> {
    const ipfsDir = getIpfsDataDir()
    return path.join(ipfsDir, PINS_FILE)
  }

  /** Проверить существование файла */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /** Сохранить pins в файл */
  private async save(): Promise<void> {
    try {
      const pinsPath = await this.getPinsFilePath()
      const ipfsDir = path.dirname(pinsPath)

      // Создаём директорию если нужно
      await fs.mkdir(ipfsDir, { recursive: true })

      const data: PinsData = {
        version: 1,
        pins: Array.from(this.pins.values()),
      }

      await fs.writeFile(pinsPath, JSON.stringify(data, null, 2), 'utf-8')
    } catch (error) {
      log.error('Ошибка сохранения pins', { error: String(error) })
    }
  }
}

/** Получить singleton instance PinManager */
export function getPinManager(): PinManager {
  return PinManager.getInstance()
}
