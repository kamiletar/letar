/**
 * PeerSyncService — синхронизация Kubo peering/bootstrap из API трекера
 *
 * Задача #214 + UPDATE #229:
 * 1. При старте подтянуть pin-серверы из API
 * 2. Применить к Kubo config (Bootstrap + Peering.Peers) — TCP + QUIC вместе
 * 3. Удалить устаревшие peers (из KNOWN_PINNER_PEER_IDS whitelist)
 * 4. Каждые 10 минут — refresh
 * 5. Каждые 30 минут — reconnect cycle (замена pin-queue логике)
 *
 * Fallback chain: API → cache → хардкод KUBO_CONFIG
 */

import { app } from 'electron'
import fs from 'fs'
import path from 'path'

import { createModuleLogger } from '../../utils/logger'
import { fetchPinServers } from '../tracker-client'
import * as kuboApi from './kubo-api-client'
import { GATEWAY_PEER_ID, KUBO_CONFIG, PINNER3_PEER_ID, PINNER4_PEER_ID, PINNER_PEER_ID } from './kubo-config'
import type {
  PeerSyncResult,
  PeerSyncSource,
  PeerSyncStatus,
  PinServer,
  PinServerCache,
  PinServerResponse,
} from './peer-sync-types'
import { KNOWN_PINNER_PEER_IDS } from './peer-sync-types'

const log = createModuleLogger('PeerSync')

const REFRESH_INTERVAL = 10 * 60_000
const RECONNECT_INTERVAL = 30 * 60_000
const RECONNECT_DELAY = 2_000
const DEFAULT_TRACKER_URL = 'https://animatrona-tracker.letar.best'
const CACHE_FILENAME = 'kubo-peers-cache.json'

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Singleton сервис синхронизации peers из API трекера.
 */
class PeerSyncService {
  private static instance: PeerSyncService | null = null

  private timerRefresh: ReturnType<typeof setInterval> | null = null
  private timerReconnect: ReturnType<typeof setInterval> | null = null

  private lastResponse: PinServerResponse | null = null
  private source: PeerSyncSource = 'hardcoded'
  private lastReconnectAt = 0
  private lastError: string | null = null
  /**
   * Unix ms последнего УСПЕХА API-вызова `fetchPinServers`.
   * Обновляется только в success-ветке, не в cache/hardcoded fallback —
   * чтобы UI «Last sync» показывал реальное время, а не stale `response.updatedAt`.
   */
  private lastSuccessfulSyncAt: number | null = null
  /**
   * Время первого зафиксированного провала API после последнего успеха.
   * Используется, чтобы поднять log.warn → log.error при затяжной недоступности (>1ч).
   */
  private firstFailureAt: number | null = null

  private constructor() {
    // singleton — используйте getInstance()
  }

  static getInstance(): PeerSyncService {
    if (!PeerSyncService.instance) {
      PeerSyncService.instance = new PeerSyncService()
    }
    return PeerSyncService.instance
  }

  /**
   * Загрузить peers один раз (без применения к Kubo).
   * Fallback: API → cache → hardcoded.
   */
  async fetchAndCache(): Promise<PinServerResponse> {
    try {
      const baseUrl = this.getTrackerBaseUrl()
      const response = await fetchPinServers(baseUrl)
      this.lastResponse = response
      this.source = 'api'
      this.lastError = null
      this.lastSuccessfulSyncAt = Date.now()
      this.firstFailureAt = null
      this.writeCache(response)
      log.info('Peers загружены из API', {
        count: response.servers.length,
        updatedAt: response.updatedAt,
      })
      return response
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.lastError = message
      const now = Date.now()
      if (this.firstFailureAt === null) {
        this.firstFailureAt = now
      }
      // Эскалация: если успех был давно (или его не было вовсе) И провалы идут больше часа —
      // пишем error, чтобы это попало в трейс/логи, а не утонуло в warn-шуме.
      const sinceLastSuccess = this.lastSuccessfulSyncAt === null ? Infinity : now - this.lastSuccessfulSyncAt
      const escalate = sinceLastSuccess > 60 * 60_000 && now - this.firstFailureAt > 60 * 60_000
      const payload = {
        error: message,
        lastSuccessfulSyncAt: this.lastSuccessfulSyncAt,
        firstFailureAt: this.firstFailureAt,
        sinceLastSuccessMs: sinceLastSuccess === Infinity ? null : sinceLastSuccess,
      }
      if (escalate) {
        log.error('Peers API недоступен > 1ч — данные устаревают', payload)
      } else {
        log.warn('Не удалось получить peers из API, пробую cache', payload)
      }
    }

    const cached = this.readCache()
    if (cached) {
      this.lastResponse = cached
      this.source = 'cache'
      log.info('Peers загружены из cache', { count: cached.servers.length })
      return cached
    }

    const hardcoded = this.buildHardcodedFallback()
    this.lastResponse = hardcoded
    this.source = 'hardcoded'
    log.warn('Peers из hardcoded fallback', { count: hardcoded.servers.length })
    return hardcoded
  }

  /**
   * Инициализировать сервис после запуска Kubo daemon.
   */
  async initialize(apiUrl: string): Promise<void> {
    log.info('Инициализация PeerSyncService', { apiUrl })

    await this.syncNow(apiUrl)

    if (this.timerRefresh) {
      clearInterval(this.timerRefresh)
    }
    this.timerRefresh = setInterval(() => {
      void this.syncNow(apiUrl).catch((err) => log.warn('Periodic sync failed', { error: String(err) }))
    }, REFRESH_INTERVAL)

    if (this.timerReconnect) {
      clearInterval(this.timerReconnect)
    }
    this.timerReconnect = setInterval(() => {
      void this.reconnectCycle(apiUrl).catch((err) => log.warn('Reconnect cycle failed', { error: String(err) }))
    }, RECONNECT_INTERVAL)

    log.info('PeerSyncService готов')
  }

  /**
   * Форсированный sync: запрос API + применение к Kubo.
   */
  async syncNow(apiUrl: string): Promise<PeerSyncResult> {
    log.info('Sync peers в Kubo')
    const response = await this.fetchAndCache()

    try {
      const { added, removed } = await this.applyToKubo(apiUrl, response)
      log.info('Sync завершён', {
        source: this.source,
        peersCount: response.servers.length,
        added,
        removed,
      })
      return {
        success: true,
        source: this.source,
        peersCount: response.servers.length,
        addedCount: added,
        removedCount: removed,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.error('Ошибка применения peers к Kubo', { error: message })
      return {
        success: false,
        source: this.source,
        peersCount: response.servers.length,
        addedCount: 0,
        removedCount: 0,
        error: message,
      }
    }
  }

  /**
   * Применить peers к Kubo config через HTTP API.
   */
  private async applyToKubo(apiUrl: string, response: PinServerResponse): Promise<{ added: number; removed: number }> {
    let added = 0
    let removed = 0

    // Relay исключаем из Peering (управляется через StaticRelays, см. kubo-config.ts:184-188)
    const apiPeerIdsToKeepInPeering = new Set<string>(
      response.servers.filter((s) => this.isPeering(s) && s.role !== 'relay').map((s) => s.peerId)
    )
    const apiPeerIdsToKeepInBootstrap = new Set<string>(
      response.servers.filter((s) => this.isBootstrap(s)).map((s) => s.peerId)
    )

    // ========================
    // Bootstrap
    // ========================
    let currentBootstrap: string[] = []
    try {
      currentBootstrap = await kuboApi.bootstrapList(apiUrl)
    } catch (error) {
      log.warn('bootstrapList failed', { error: String(error) })
    }

    // Удалить устаревшие из whitelist
    for (const addr of currentBootstrap) {
      const peerIdMatch = /\/p2p\/([^/]+)$/.exec(addr)
      const peerId = peerIdMatch?.[1]
      if (!peerId) {
        continue
      }
      if (KNOWN_PINNER_PEER_IDS.has(peerId) && !apiPeerIdsToKeepInBootstrap.has(peerId)) {
        try {
          await kuboApi.bootstrapRm(apiUrl, addr)
          removed++
          log.info('Bootstrap: удалён устаревший peer', { peerId, addr })
        } catch (error) {
          log.warn('bootstrapRm failed', { addr, error: String(error) })
        }
      }
    }

    // Добавить новые
    const currentBootstrapSet = new Set(currentBootstrap)
    for (const server of response.servers) {
      if (!this.isBootstrap(server)) {
        continue
      }
      for (const multiaddr of server.multiaddrs) {
        if (currentBootstrapSet.has(multiaddr)) {
          continue
        }
        try {
          await kuboApi.bootstrapAdd(apiUrl, multiaddr)
          added++
          log.info('Bootstrap: добавлен peer', { name: server.name, multiaddr })
        } catch (error) {
          log.warn('bootstrapAdd failed', { multiaddr, error: String(error) })
        }
      }
    }

    // ========================
    // Peering
    // ========================
    let currentPeers: Array<{ ID: string; Addrs: string[] }> = []
    try {
      const peeringRaw = (await kuboApi.configGet(apiUrl, 'Peering')) as {
        Peers?: Array<{ ID: string; Addrs: string[] }>
      } | null
      currentPeers = peeringRaw?.Peers ?? []
    } catch (error) {
      log.warn('configGet Peering failed', { error: String(error) })
    }

    const newPeers: Array<{ ID: string; Addrs: string[] }> = []

    for (const server of response.servers) {
      if (!this.isPeering(server)) {
        continue
      }
      if (server.role === 'relay') {
        log.debug('Peering: relay пропущен (StaticRelays)', { peerId: server.peerId })
        continue
      }
      newPeers.push({ ID: server.peerId, Addrs: server.multiaddrs })
    }

    // Сохранить peers которых нет в whitelist (пользовательские добавления)
    for (const peer of currentPeers) {
      if (!KNOWN_PINNER_PEER_IDS.has(peer.ID)) {
        newPeers.push(peer)
      } else if (!apiPeerIdsToKeepInPeering.has(peer.ID)) {
        removed++
        log.info('Peering: удалён устаревший peer', { peerId: peer.ID })
      }
    }

    try {
      await kuboApi.configSet(apiUrl, 'Peering', { Peers: newPeers })
      log.info('Peering обновлён', { peersCount: newPeers.length })
    } catch (error) {
      log.warn('configSet Peering failed', { error: String(error) })
    }

    // Форсировать swarmConnect для новых peers
    for (const server of response.servers) {
      if (server.role === 'relay') {
        continue
      }
      for (const multiaddr of server.multiaddrs) {
        await kuboApi.swarmConnect(apiUrl, multiaddr)
      }
    }

    return { added, removed }
  }

  /**
   * Reconnect cycle — замена pin-queue логике.
   * Каждые 30 мин: disconnect → 2s → connect для каждого peer.
   */
  async reconnectCycle(apiUrl: string): Promise<void> {
    if (!this.lastResponse) {
      log.debug('Reconnect cycle: нет lastResponse, пропускаем')
      return
    }

    const peers = this.lastResponse.servers
    log.info('Reconnect cycle started', { peersCount: peers.length })

    for (const server of peers) {
      try {
        await kuboApi.swarmDisconnect(apiUrl, server.peerId)
        await sleep(RECONNECT_DELAY)
        for (const multiaddr of server.multiaddrs) {
          await kuboApi.swarmConnect(apiUrl, multiaddr)
        }
        log.info('reconnected', { peerId: server.peerId, name: server.name })
      } catch (error) {
        log.warn('reconnect failed', {
          peerId: server.peerId,
          name: server.name,
          error: String(error),
        })
      }
    }

    this.lastReconnectAt = Date.now()
    log.info('Reconnect cycle completed')
  }

  shutdown(): void {
    if (this.timerRefresh) {
      clearInterval(this.timerRefresh)
      this.timerRefresh = null
    }
    if (this.timerReconnect) {
      clearInterval(this.timerReconnect)
      this.timerReconnect = null
    }
    log.info('PeerSyncService остановлен')
  }

  getStatus(): PeerSyncStatus {
    return {
      peers: this.lastResponse?.servers ?? [],
      lastSyncAt: this.lastSuccessfulSyncAt,
      lastResponseUpdatedAt: this.lastResponse?.updatedAt ?? null,
      lastReconnectAt: this.lastReconnectAt || null,
      source: this.source,
      lastError: this.lastError,
    }
  }

  // ========================
  // Helpers
  // ========================

  private isBootstrap(server: PinServer): boolean {
    return server.peeringRole === 'bootstrap' || server.peeringRole === 'both'
  }

  private isPeering(server: PinServer): boolean {
    return server.peeringRole === 'peering' || server.peeringRole === 'both'
  }

  private getTrackerBaseUrl(): string {
    try {
      const configPath = path.join(app.getPath('userData'), 'tracker-config.json')
      if (fs.existsSync(configPath)) {
        const data = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as { baseUrl?: string }
        if (data.baseUrl) {
          return data.baseUrl
        }
      }
    } catch (error) {
      log.debug('getTrackerBaseUrl fallback', { error: String(error) })
    }
    return DEFAULT_TRACKER_URL
  }

  private getCachePath(): string {
    return path.join(app.getPath('userData'), CACHE_FILENAME)
  }

  private writeCache(response: PinServerResponse): void {
    try {
      const cache: PinServerCache = { ...response, savedAt: Date.now() }
      fs.writeFileSync(this.getCachePath(), JSON.stringify(cache, null, 2))
    } catch (error) {
      log.warn('writeCache failed', { error: String(error) })
    }
  }

  private readCache(): PinServerResponse | null {
    try {
      const cachePath = this.getCachePath()
      if (!fs.existsSync(cachePath)) {
        return null
      }
      const raw = fs.readFileSync(cachePath, 'utf-8')
      return JSON.parse(raw) as PinServerCache
    } catch (error) {
      log.warn('readCache failed', { error: String(error) })
      return null
    }
  }

  /**
   * Fallback на хардкод — если API + cache недоступны.
   */
  private buildHardcodedFallback(): PinServerResponse {
    const servers: PinServer[] = []

    const pinner1Peering = KUBO_CONFIG.Peering.Peers.find((p) => p.ID === PINNER_PEER_ID)
    if (pinner1Peering) {
      servers.push({
        id: 'pinner1-hardcoded',
        name: 'Pinner 1 (mail, hardcoded)',
        role: 'pinner',
        peerId: PINNER_PEER_ID,
        multiaddrs: Array.from(pinner1Peering.Addrs).map((addr) => `${addr}/p2p/${PINNER_PEER_ID}`),
        peeringRole: 'both',
      })
    }

    const pinner3Peering = KUBO_CONFIG.Peering.Peers.find((p) => p.ID === PINNER3_PEER_ID)
    if (pinner3Peering) {
      servers.push({
        id: 'pinner3-hardcoded',
        name: 'Pinner 3 (hardcoded)',
        role: 'pinner',
        peerId: PINNER3_PEER_ID,
        multiaddrs: Array.from(pinner3Peering.Addrs).map((addr) => `${addr}/p2p/${PINNER3_PEER_ID}`),
        peeringRole: 'both',
      })
    }

    const pinner4Peering = KUBO_CONFIG.Peering.Peers.find((p) => p.ID === PINNER4_PEER_ID)
    if (pinner4Peering) {
      servers.push({
        id: 'pinner4-hardcoded',
        name: 'Pinner 4 / Gateway (s3, hardcoded)',
        role: 'pinner',
        peerId: PINNER4_PEER_ID,
        multiaddrs: Array.from(pinner4Peering.Addrs).map((addr) => `${addr}/p2p/${PINNER4_PEER_ID}`),
        peeringRole: 'both',
      })
    }

    const gatewayPeering = KUBO_CONFIG.Peering.Peers.find((p) => p.ID === GATEWAY_PEER_ID)
    if (gatewayPeering) {
      servers.push({
        id: 'gateway-hardcoded',
        name: 'Gateway (s2, hardcoded)',
        role: 'gateway',
        peerId: GATEWAY_PEER_ID,
        multiaddrs: Array.from(gatewayPeering.Addrs).map((addr) => `${addr}/p2p/${GATEWAY_PEER_ID}`),
        peeringRole: 'peering',
      })
    }

    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      servers,
    }
  }
}

export function getPeerSyncService(): PeerSyncService {
  return PeerSyncService.getInstance()
}

export type { PeerSyncService }
