/**
 * Pinata Service — интеграция с Pinata IPFS pinning
 *
 * Использует Pinata REST API для:
 * - Pin by CID (закрепление существующего контента)
 * - List pins (список закреплённого контента)
 * - Unpin (открепление)
 * - Pin jobs (отслеживание статуса)
 *
 * @see https://docs.pinata.cloud/api-reference
 */

import type {
  PinataConfig,
  PinataPinJob,
  PinataPinJobStatus,
  PinataStats,
  RemotePin,
  RemotePinConfig,
  RemotePinOptions,
  RemotePinStatus,
} from '../../shared/types/remote-pinning'
import { DEFAULT_REMOTE_PIN_CONFIG } from '../../shared/types/remote-pinning'
import { createConfigStore } from '../utils/config-store'
import { createModuleLogger } from '../utils/logger'

const PINATA_API_BASE = 'https://api.pinata.cloud'

const log = createModuleLogger('PinataService')

/** Config store для remote pinning */
const remotePinConfigStore = createConfigStore<RemotePinConfig>('remote-pinning.json', DEFAULT_REMOTE_PIN_CONFIG)

/** Загрузить конфигурацию */
export async function loadRemotePinConfig(): Promise<RemotePinConfig> {
  return remotePinConfigStore.load()
}

/** Сохранить конфигурацию */
export async function saveRemotePinConfig(config: RemotePinConfig): Promise<void> {
  await remotePinConfigStore.save(config)
}

/** Обновить конфигурацию */
export async function updateRemotePinConfig(updates: Partial<RemotePinConfig>): Promise<RemotePinConfig> {
  return remotePinConfigStore.update(updates)
}

/** Обновить конфигурацию Pinata */
export async function updatePinataConfig(updates: Partial<PinataConfig>): Promise<RemotePinConfig> {
  const config = await loadRemotePinConfig()
  config.pinata = { ...config.pinata, ...updates }
  await saveRemotePinConfig(config)
  return config
}

/**
 * Проверить валидность JWT токена
 */
export async function testPinataAuth(jwt: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(`${PINATA_API_BASE}/data/testAuthentication`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    })

    if (response.ok) {
      return { valid: true }
    }

    const errorText = await response.text()
    return { valid: false, error: `HTTP ${response.status}: ${errorText}` }
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Маппинг статуса Pinata в наш статус
 */
function _mapPinJobStatus(status: PinataPinJobStatus): RemotePinStatus {
  switch (status) {
    case 'prechecking':
    case 'searching':
      return 'queued'
    case 'retrieving':
      return 'pinning'
    case 'expired':
    case 'over_free_limit':
    case 'over_max_size':
    case 'invalid_object':
    case 'bad_host_node':
      return 'failed'
    default:
      return 'queued'
  }
}

/**
 * Pinata Service Singleton
 */
class PinataService {
  private static instance: PinataService | null = null

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- Singleton pattern
  private constructor() {}

  static getInstance(): PinataService {
    if (!PinataService.instance) {
      PinataService.instance = new PinataService()
    }
    return PinataService.instance
  }

  /**
   * Получить JWT токен из конфигурации
   */
  private async getJwt(): Promise<string | null> {
    const config = await loadRemotePinConfig()
    if (!config.pinata.enabled || !config.pinata.jwt) {
      return null
    }
    return config.pinata.jwt
  }

  /**
   * Выполнить запрос к Pinata API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const jwt = await this.getJwt()
    if (!jwt) {
      return { success: false, error: 'Pinata не настроена. Добавьте JWT токен.' }
    }

    try {
      const response = await fetch(`${PINATA_API_BASE}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        log.error('API error', { status: response.status, errorText })
        return { success: false, error: `HTTP ${response.status}: ${errorText}` }
      }

      const data = (await response.json()) as T
      return { success: true, data }
    } catch (error) {
      log.error('Request error', { error })
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Pin by CID — закрепить существующий контент из IPFS сети
   */
  async pinByCid(
    cid: string,
    options: RemotePinOptions = {},
  ): Promise<{ success: boolean; data?: PinataPinJob; error?: string }> {
    log.info('Pin by CID', { cid })

    const body: Record<string, unknown> = {
      hashToPin: cid,
    }

    if (options.name || options.metadata) {
      body.pinataMetadata = {
        name: options.name || cid.slice(0, 16),
        keyvalues: options.metadata || {},
      }
    }

    if (options.hostNodes && options.hostNodes.length > 0) {
      body.pinataOptions = {
        hostNodes: options.hostNodes.slice(0, 5), // Максимум 5 host nodes
      }
    }

    const result = await this.request<{
      id: string
      ipfsHash: string
      status: string
      name: string
    }>('/pinning/pinByHash', {
      method: 'POST',
      body: JSON.stringify(body),
    })

    if (result.success && result.data) {
      const job: PinataPinJob = {
        id: result.data.id,
        ipfsPinHash: result.data.ipfsHash,
        dateQueued: new Date().toISOString(),
        name: options.name,
        status: 'searching',
      }
      return { success: true, data: job }
    }

    return { success: false, error: result.error }
  }

  /**
   * Получить статус pin job
   */
  async getPinJobStatus(jobId: string): Promise<{ success: boolean; data?: PinataPinJob; error?: string }> {
    const result = await this.request<{
      rows: Array<{
        id: string
        ipfs_pin_hash: string
        date_queued: string
        name: string
        status: PinataPinJobStatus
        host_nodes: string[]
      }>
    }>(`/pinning/pinJobs?ipfs_pin_hash=${jobId}&limit=1`)

    if (result.success && result.data && result.data.rows.length > 0) {
      const row = result.data.rows[0]
      const job: PinataPinJob = {
        id: row.id,
        ipfsPinHash: row.ipfs_pin_hash,
        dateQueued: row.date_queued,
        name: row.name,
        status: row.status,
        hostNodes: row.host_nodes,
      }
      return { success: true, data: job }
    }

    return { success: false, error: result.error || 'Job not found' }
  }

  /**
   * Получить список всех пинов
   */
  async listPins(limit = 100, offset = 0): Promise<{ success: boolean; data?: RemotePin[]; error?: string }> {
    const result = await this.request<{
      count: number
      rows: Array<{
        id: string
        ipfs_pin_hash: string
        size: number
        date_pinned: string
        metadata: {
          name?: string
          keyvalues?: Record<string, string>
        }
      }>
    }>(`/data/pinList?status=pinned&pageLimit=${limit}&pageOffset=${offset}`)

    if (result.success && result.data) {
      const pins: RemotePin[] = result.data.rows.map((row) => ({
        id: row.id,
        cid: row.ipfs_pin_hash,
        name: row.metadata?.name || row.ipfs_pin_hash.slice(0, 16),
        status: 'pinned' as RemotePinStatus,
        size: row.size,
        createdAt: row.date_pinned,
        metadata: row.metadata?.keyvalues,
      }))
      return { success: true, data: pins }
    }

    return { success: false, error: result.error }
  }

  /**
   * Открепить контент
   */
  async unpin(cid: string): Promise<{ success: boolean; error?: string }> {
    log.info('Unpin', { cid })

    const result = await this.request(`/pinning/unpin/${cid}`, {
      method: 'DELETE',
    })

    return { success: result.success, error: result.error }
  }

  /**
   * Проверить, закреплён ли CID
   */
  async isPinned(cid: string): Promise<{ success: boolean; data?: boolean; error?: string }> {
    const result = await this.request<{
      count: number
      rows: unknown[]
    }>(`/data/pinList?status=pinned&hashContains=${cid}&pageLimit=1`)

    if (result.success && result.data) {
      return { success: true, data: result.data.count > 0 }
    }

    return { success: false, error: result.error }
  }

  /**
   * Получить информацию о пине
   */
  async getPin(cid: string): Promise<{ success: boolean; data?: RemotePin | null; error?: string }> {
    const result = await this.request<{
      count: number
      rows: Array<{
        id: string
        ipfs_pin_hash: string
        size: number
        date_pinned: string
        metadata: {
          name?: string
          keyvalues?: Record<string, string>
        }
      }>
    }>(`/data/pinList?status=pinned&hashContains=${cid}&pageLimit=1`)

    if (result.success && result.data) {
      if (result.data.count === 0) {
        return { success: true, data: null }
      }

      const row = result.data.rows[0]
      const pin: RemotePin = {
        id: row.id,
        cid: row.ipfs_pin_hash,
        name: row.metadata?.name || row.ipfs_pin_hash.slice(0, 16),
        status: 'pinned',
        size: row.size,
        createdAt: row.date_pinned,
        metadata: row.metadata?.keyvalues,
      }
      return { success: true, data: pin }
    }

    return { success: false, error: result.error }
  }

  /**
   * Получить статистику
   */
  async getStats(): Promise<{ success: boolean; data?: PinataStats; error?: string }> {
    // Получаем общее количество пинов
    const result = await this.request<{
      count: number
      rows: Array<{ size: number }>
    }>('/data/pinList?status=pinned&pageLimit=1000')

    if (result.success && result.data) {
      const totalSize = result.data.rows.reduce((sum, row) => sum + row.size, 0)
      // Free tier Pinata = 1 GB
      const FREE_TIER_LIMIT = 1024 * 1024 * 1024
      return {
        success: true,
        data: {
          pinCount: result.data.count,
          totalSize,
          totalPins: result.data.count,
          pinSizeLimit: FREE_TIER_LIMIT,
        },
      }
    }

    return { success: false, error: result.error }
  }

  /**
   * Обновить метаданные пина
   */
  async updateMetadata(
    cid: string,
    name: string,
    keyvalues?: Record<string, string>,
  ): Promise<{ success: boolean; error?: string }> {
    const body: Record<string, unknown> = {
      ipfsPinHash: cid,
      name,
    }

    if (keyvalues) {
      body.keyvalues = keyvalues
    }

    const result = await this.request('/pinning/hashMetadata', {
      method: 'PUT',
      body: JSON.stringify(body),
    })

    return { success: result.success, error: result.error }
  }
}

/**
 * Получить экземпляр Pinata сервиса
 */
export function getPinataService(): PinataService {
  return PinataService.getInstance()
}
