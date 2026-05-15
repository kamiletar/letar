/**
 * IPC Handlers для Remote Pinning (Pinata)
 *
 * Каналы:
 * - remotePin:getConfig — Получить конфигурацию
 * - remotePin:updateConfig — Обновить конфигурацию
 * - remotePin:testAuth — Проверить JWT токен
 * - remotePin:pin — Закрепить CID на Pinata
 * - remotePin:unpin — Открепить CID
 * - remotePin:list — Список пинов
 * - remotePin:get — Получить информацию о пине
 * - remotePin:isPinned — Проверить, закреплён ли CID
 * - remotePin:stats — Статистика
 * - remotePin:updateMetadata — Обновить метаданные пина
 */

import type { PinataConfig, PinataPinJob, RemotePinConfig, RemotePinOptions } from '../../shared/types/remote-pinning'
import {
  getPinataService,
  loadRemotePinConfig,
  testPinataAuth,
  updatePinataConfig,
  updateRemotePinConfig,
} from '../services/pinata-service'
import { broadcastToWindows, createHandler } from '../utils/ipc-handler-factory'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('RemotePinHandlers')

/** Флаг для предотвращения повторной регистрации */
let isRegistered = false

/** Создать безопасную версию конфига (без JWT токена) */
function makeSafeConfig(config: RemotePinConfig): RemotePinConfig {
  return {
    ...config,
    pinata: {
      ...config.pinata,
      jwt: config.pinata.jwt ? '***configured***' : '',
    },
  }
}

/**
 * Регистрация IPC handlers для Remote Pinning
 */
export function registerRemotePinHandlers(): void {
  if (isRegistered) {
    log.warn('Handlers already registered, skipping')
    return
  }

  const pinata = getPinataService()

  // Получить конфигурацию
  createHandler('remotePin:getConfig', async () => makeSafeConfig(await loadRemotePinConfig()))

  // Обновить конфигурацию
  createHandler('remotePin:updateConfig', async (updates: Partial<RemotePinConfig>) => {
    const config = await updateRemotePinConfig(updates)
    const safeConfig = makeSafeConfig(config)
    broadcastToWindows('remotePin:configUpdated', safeConfig)
    return safeConfig
  })

  // Обновить конфигурацию Pinata (включая JWT)
  createHandler('remotePin:updatePinataConfig', async (updates: Partial<PinataConfig>) => {
    const config = await updatePinataConfig(updates)
    const safeConfig = makeSafeConfig(config)
    broadcastToWindows('remotePin:configUpdated', safeConfig)
    return safeConfig
  })

  // Проверить JWT токен
  createHandler('remotePin:testAuth', async (jwt: string) => {
    const result = await testPinataAuth(jwt)
    return { valid: result.valid }
  })

  // Закрепить CID
  createHandler('remotePin:pin', async (cid: string, options?: RemotePinOptions): Promise<PinataPinJob | null> => {
    const result = await pinata.pinByCid(cid, options)
    if (result.success && result.data) {
      broadcastToWindows('remotePin:pinStarted', result.data)
      return result.data
    }
    if (!result.success) {
      throw new Error(result.error ?? 'Unknown error')
    }
    return null
  })

  // Открепить CID
  createHandler('remotePin:unpin', async (cid: string) => {
    const result = await pinata.unpin(cid)
    if (result.success) {
      broadcastToWindows('remotePin:unpinned', { cid })
    }
    if (!result.success) {
      throw new Error(result.error ?? 'Unknown error')
    }
  })

  // Список пинов
  createHandler('remotePin:list', async (limit?: number, offset?: number) => {
    const result = await pinata.listPins(limit, offset)
    if (!result.success) {
      throw new Error(result.error ?? 'Unknown error')
    }
    return result.data
  })

  // Получить информацию о пине
  createHandler('remotePin:get', async (cid: string) => {
    const result = await pinata.getPin(cid)
    if (!result.success) {
      throw new Error(result.error ?? 'Unknown error')
    }
    return result.data
  })

  // Проверить, закреплён ли CID
  createHandler('remotePin:isPinned', async (cid: string) => {
    const result = await pinata.isPinned(cid)
    if (!result.success) {
      throw new Error(result.error ?? 'Unknown error')
    }
    return result.data
  })

  // Статистика
  createHandler('remotePin:stats', async () => {
    const result = await pinata.getStats()
    if (!result.success) {
      throw new Error(result.error ?? 'Unknown error')
    }
    return result.data
  })

  // Обновить метаданные
  createHandler('remotePin:updateMetadata', async (cid: string, name: string, keyvalues?: Record<string, string>) => {
    const result = await pinata.updateMetadata(cid, name, keyvalues)
    if (result.success) {
      broadcastToWindows('remotePin:metadataUpdated', { cid, name, keyvalues })
    }
    if (!result.success) {
      throw new Error(result.error ?? 'Unknown error')
    }
  })

  // Получить статус pin job
  createHandler('remotePin:getJobStatus', async (jobId: string) => {
    const result = await pinata.getPinJobStatus(jobId)
    if (!result.success) {
      throw new Error(result.error ?? 'Unknown error')
    }
    return result.data
  })

  isRegistered = true
  // Handlers registered (no logging needed)
}
