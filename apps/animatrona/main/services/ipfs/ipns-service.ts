/**
 * IPNS Service — Публикация и разрешение IPNS имён
 *
 * ТЕПЕРЬ ИСПОЛЬЗУЕТ Kubo (Go-IPFS) через kubo-rpc-client!
 *
 * IPNS (InterPlanetary Name System) позволяет создавать
 * обновляемые указатели на IPFS контент.
 *
 * Каждое IPNS имя привязано к криптографическому ключу (Ed25519).
 * Владелец ключа может обновлять указатель на новый CID.
 */

import { EventEmitter } from 'events'

import { createModuleLogger } from '../../utils/logger'
import { getKuboService } from '../kubo'

const log = createModuleLogger('IpnsService')

/**
 * Результат публикации IPNS
 */
export interface IpnsPublishResult {
  /** IPNS имя (base36 encoded) */
  name: string
  /** CID на который указывает имя */
  cid: string
  /** Время жизни записи (ISO string) */
  expiry: string
}

/**
 * Результат разрешения IPNS
 */
export interface IpnsResolveResult {
  /** Разрешённый CID */
  cid: string
  /** Путь внутри CID (если был указан) */
  path?: string
}

/**
 * IPNS Service — Singleton для работы с IPNS через Kubo
 */
export class IpnsService extends EventEmitter {
  private static instance: IpnsService | null = null

  private constructor() {
    super()
  }

  /** Получить singleton instance */
  static getInstance(): IpnsService {
    if (!IpnsService.instance) {
      IpnsService.instance = new IpnsService()
    }
    return IpnsService.instance
  }

  /**
   * Опубликовать CID под IPNS именем текущей ноды
   *
   * @param cid - CID контента для публикации
   * @param lifetime - Время жизни записи (по умолчанию 24 часа)
   */
  async publish(cid: string, lifetime = '24h'): Promise<IpnsPublishResult> {
    const kuboService = getKuboService()
    const client = kuboService.getClient()

    const peerId = kuboService.getPeerId()
    if (!peerId) {
      throw new Error('Kubo не запущен или PeerId не определён')
    }

    log.info('Публикация IPNS', { cid, name: peerId })

    // Публикуем через Kubo API
    const result = await client.name.publish(cid, {
      lifetime,
      key: 'self', // Используем ключ ноды по умолчанию
    })

    const publishResult: IpnsPublishResult = {
      name: result.name,
      cid: cid,
      expiry: new Date(Date.now() + this.parseLifetimeMs(lifetime)).toISOString(),
    }

    log.info('Опубликовано', { name: publishResult.name, cid: publishResult.cid })
    this.emit('published', publishResult)

    return publishResult
  }

  /**
   * Разрешить IPNS имя в CID
   *
   * @param name - IPNS имя (PeerId или DNSLink)
   */
  async resolve(name: string): Promise<IpnsResolveResult> {
    const kuboService = getKuboService()
    const client = kuboService.getClient()

    log.info('Разрешение IPNS', { name })

    // Kubo name.resolve возвращает AsyncIterable с путём
    let resolvedPath = ''
    for await (const path of client.name.resolve(name)) {
      resolvedPath = path
    }

    // Путь имеет формат /ipfs/CID или /ipfs/CID/path
    const match = resolvedPath.match(/^\/ipfs\/([^/]+)(.*)$/)
    if (!match) {
      throw new Error(`Не удалось разрешить IPNS имя: ${name}`)
    }

    const resolveResult: IpnsResolveResult = {
      cid: match[1],
      path: match[2] || undefined,
    }

    log.info('Разрешено', { name, cid: resolveResult.cid })
    this.emit('resolved', { name, ...resolveResult })

    return resolveResult
  }

  /**
   * Получить IPNS имя текущей ноды (PeerId)
   */
  async getName(): Promise<string | null> {
    const kuboService = getKuboService()
    return kuboService.getPeerId()
  }

  /**
   * Republish — переопубликовать все записи
   * (полезно для продления срока жизни)
   *
   * Примечание: Kubo автоматически переопубликует записи,
   * но можно форсировать через повторную публикацию.
   */
  async republish(): Promise<void> {
    log.info('Переопубликация через Kubo (автоматическая)')
    // Kubo автоматически переопубликует записи каждые 4 часа
    // Для ручного republish нужно знать текущий CID
    this.emit('republished')
  }

  /**
   * Сбросить состояние (для совместимости)
   */
  reset(): void {
    log.info('Сброс')
  }

  // === Вспомогательные методы ===

  /**
   * Парсинг lifetime строки в миллисекунды
   */
  private parseLifetimeMs(lifetime: string): number {
    const match = lifetime.match(/^(\d+)(h|m|s|d)$/)
    if (!match) {
      return 24 * 60 * 60 * 1000
    } // default 24h

    const value = parseInt(match[1], 10)
    const unit = match[2]

    switch (unit) {
      case 's':
        return value * 1000
      case 'm':
        return value * 60 * 1000
      case 'h':
        return value * 60 * 60 * 1000
      case 'd':
        return value * 24 * 60 * 60 * 1000
      default:
        return 24 * 60 * 60 * 1000
    }
  }
}

/** Получить singleton instance IpnsService */
export function getIpnsService(): IpnsService {
  return IpnsService.getInstance()
}
