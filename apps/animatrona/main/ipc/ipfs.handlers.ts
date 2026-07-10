/**
 * IPC Handlers для IPFS
 *
 * Каналы:
 * - ipfs:status — Получить статус ноды
 * - ipfs:getPeerId — Получить PeerId
 * - ipfs:start — Запустить ноду
 * - ipfs:stop — Остановить ноду
 * - ipfs:addFile — Добавить файл в IPFS
 * - ipfs:addDirectory — Добавить директорию в IPFS
 * - ipfs:cat — Прочитать контент по CID
 * - ipfs:stat — Получить статистику по CID
 * - ipfs:has — Проверить наличие контента локально
 * - ipfs:saveToFile — Сохранить контент из IPFS в файл
 * - ipfs:pin — Закрепить контент
 * - ipfs:unpin — Открепить контент
 * - ipfs:isPinned — Проверить статус pin
 * - ipfs:listPins — Список всех pins
 * - ipfs:pinStats — Статистика pins
 * - ipns:publish — Опубликовать CID под IPNS именем
 * - ipns:resolve — Разрешить IPNS имя в CID
 * - ipns:getName — Получить IPNS имя текущей ноды
 * - ipns:republish — Переопубликовать все записи
 */

import {
  addDirectory,
  addFile,
  cat,
  getIpnsService,
  getPinManager,
  has,
  repoGc,
  saveToFile,
  stat,
} from '../services/ipfs'
import { bulkUnpin } from '../services/ipfs/bulk-unpin'
import { findOrphanedPins } from '../services/ipfs/orphan-audit'
import { normalizeAllPins } from '../services/ipfs/pin-normalizer'
import { getKuboService } from '../services/kubo'
import { broadcastToWindows, createHandler, forwardEvents } from '../utils/ipc-handler-factory'

/**
 * Регистрация IPC handlers для IPFS
 */
export function registerIpfsHandlers(): void {
  const kuboService = getKuboService()
  const pinManager = getPinManager()
  const ipnsService = getIpnsService()

  // === Основные операции ноды ===
  createHandler('ipfs:status', () => kuboService.getIpfsStatus())
  createHandler('ipfs:diagnostics', () => kuboService.getDiagnostics())
  createHandler('ipfs:getPeerId', () => kuboService.getPeerId())
  createHandler('ipfs:start', () => kuboService.initialize())
  createHandler('ipfs:stop', () => kuboService.shutdown())

  // === Операции с контентом ===
  createHandler('ipfs:addFile', (filePath: string) => addFile(filePath))
  createHandler('ipfs:addDirectory', (dirPath: string, recursive = true) => addDirectory(dirPath, recursive))
  createHandler('ipfs:cat', async (cid: string) => {
    const content = await cat(cid)
    // Возвращаем как base64 для передачи через IPC
    return content.toString('base64')
  })
  createHandler('ipfs:stat', (cid: string) => stat(cid))
  createHandler('ipfs:has', (cid: string) => has(cid))
  createHandler('ipfs:saveToFile', (cid: string, outputPath: string) => saveToFile(cid, outputPath))

  // === Kubo Gateway (прямой доступ из renderer) ===
  // Renderer обращается к Kubo gateway напрямую, без кастомного gateway-сервера

  // === Repo ===
  createHandler('ipfs:repoGc', () => repoGc())

  // === Pinning ===
  createHandler('ipfs:pin', (cid: string, name?: string) => pinManager.pin(cid, name))
  createHandler('ipfs:unpin', (cid: string) => pinManager.unpin(cid))
  createHandler('ipfs:isPinned', (cid: string) => pinManager.isPinned(cid))
  createHandler('ipfs:getPin', (cid: string) => pinManager.getPin(cid))
  createHandler('ipfs:listPins', () => pinManager.listPins())
  createHandler('ipfs:pinStats', () => pinManager.getStats())
  createHandler('ipfs:renamePin', (cid: string, name: string) => pinManager.rename(cid, name))

  // === PeerSync — синхронизация Kubo peers из API трекера ===
  createHandler('kubo:getSyncedPeers', async () => {
    const { getPeerSyncService } = await import('../services/kubo/peer-sync-service')
    return getPeerSyncService().getStatus()
  })

  createHandler('kubo:forceSyncPeers', async () => {
    const apiUrl = kuboService.getApiUrl()
    if (!apiUrl) {
      return { success: false, error: 'Kubo API недоступен' }
    }
    const { getPeerSyncService } = await import('../services/kubo/peer-sync-service')
    return getPeerSyncService().syncNow(apiUrl)
  })

  createHandler('kubo:forceReconnect', async () => {
    const apiUrl = kuboService.getApiUrl()
    if (!apiUrl) {
      return { success: false, error: 'Kubo API недоступен' }
    }
    const { getPeerSyncService } = await import('../services/kubo/peer-sync-service')
    await getPeerSyncService().reconnectCycle(apiUrl)
    return { success: true }
  })

  // === Аудит — поиск осиротевших pins (Kubo API напрямую) ===
  createHandler('ipfs:findOrphanedPins', async () => {
    return findOrphanedPins(
      undefined,
      (current, total, name) => {
        broadcastToWindows('ipfs:auditProgress', { current, total, name })
      },
      (step) => {
        broadcastToWindows('ipfs:auditStep', { step })
      }
    )
  })

  // === Массовое удаление pins (для очистки orphans) ===
  createHandler('ipfs:bulkUnpin', async (cids: string[]) => {
    return bulkUnpin(cids, (current, total) => {
      broadcastToWindows('ipfs:bulkUnpinProgress', { current, total })
    })
  })

  // === Нормализация pins — снять recursive pin с дочерних CID directoryCid'ов ===
  createHandler('ipfs:normalizePins', async () => {
    return normalizeAllPins((step, current, total) => {
      broadcastToWindows('ipfs:normalizeStep', { step, current, total })
    })
  })

  // === Закрепить missing pins (referenced в БД, но не запинены в Kubo) ===
  createHandler('ipfs:pinMissing', async (cids: string[]) => {
    const { CID } = await import('multiformats/cid')
    const client = kuboService.getClientOrNull()
    if (!client) {
      throw new Error('Kubo клиент недоступен')
    }

    let pinned = 0
    let failed = 0
    for (const cidStr of cids) {
      try {
        await client.pin.add(CID.parse(cidStr))
        pinned++
      } catch {
        failed++
      }
    }
    return { pinned, failed }
  })

  // === IPNS ===
  createHandler('ipns:publish', (cid: string, lifetime?: string) => ipnsService.publish(cid, lifetime))
  createHandler('ipns:resolve', (name: string) => ipnsService.resolve(name))
  createHandler('ipns:getName', () => ipnsService.getName())
  createHandler('ipns:republish', () => ipnsService.republish())

  // === События ===
  forwardEvents(kuboService, 'ipfs', {
    'status:changed': 'statusChanged',
    'peer:connected': 'peerConnected',
    'peer:disconnected': 'peerDisconnected',
    error: 'error',
  })

  forwardEvents(pinManager, 'ipfs', {
    pinned: 'pinned',
    unpinned: 'unpinned',
  })

  forwardEvents(ipnsService, 'ipns', {
    published: 'published',
    resolved: 'resolved',
  })

  // === Kubo (Go IPFS) ===
  createHandler('kubo:status', () => kuboService.getStatus())
  createHandler('kubo:start', () => kuboService.initialize())
  createHandler('kubo:stop', () => kuboService.shutdown())
  createHandler('kubo:getPeerId', () => kuboService.getPeerId())
  createHandler('kubo:getMode', () => kuboService.getMode())
  createHandler('kubo:getGatewayUrl', () => kuboService.getGatewayUrl())

  forwardEvents(kuboService, 'kubo', {
    'status:changed': 'statusChanged',
    'peer:connected': 'peerConnected',
    'peer:disconnected': 'peerDisconnected',
    error: 'error',
  })

  // === Миграция к IPFS-директориям ===
}
