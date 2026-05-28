/**
 * KuboService — Фасад для управления Kubo (Go IPFS) демоном
 *
 * Стратегия:
 * 1. Проверяем наличие IPFS Desktop → используем если есть
 * 2. Иначе запускаем embedded Kubo через child_process.spawn
 *
 * Координирует подмодули:
 * - kubo-daemon: управление бинарником и процессом
 * - kubo-health: проверка здоровья и переподключение
 * - kubo-relay: регистрация на relay-сервере
 * - kubo-stats: статистика пиров и трафика
 */

import type { ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import type { KuboRPCClient } from 'kubo-rpc-client'

import type { IpfsServiceStatus, P2PDiagnostics } from '../../../shared/types/ipfs'
import { createModuleLogger } from '../../utils/logger'
import { KUBO_PORTS } from './kubo-config'
import { getKuboBinaryPath, getKuboRepoPath, prepareKuboRepo, spawnKuboDaemon, validateKuboBinary } from './kubo-daemon'
import { detectIpfsDesktop, type IpfsDesktopInfo, isIpfsDesktopAlive } from './kubo-detector'
import { checkApiAvailable, checkHealth } from './kubo-health'
import {
  createRelayHeartbeat,
  createRelayMonitor,
  registerWithRelay,
  stopRelayHeartbeat,
  stopRelayMonitor,
} from './kubo-relay'
import { getBandwidthOnly, getIpfsStatus, updatePeerCount } from './kubo-stats'
import type { KuboCurrentPorts, KuboMode, KuboServiceStatus } from './kubo-types'

// Реэкспортируем типы для обратной совместимости
export type { KuboMode, KuboServiceEvents, KuboServiceStatus } from './kubo-types'

const log = createModuleLogger('KuboService')

/**
 * Singleton сервис для управления Kubo
 *
 * Фасад: делегирует работу подмодулям, хранит всё состояние.
 */
export class KuboService extends EventEmitter {
  private static instance: KuboService | null = null

  /** Режим работы */
  private mode: KuboMode = 'none'

  /** Kubo RPC клиент */
  private client: KuboRPCClient | null = null

  /** Kubo daemon процесс (для embedded режима) */
  private kuboProcess: ChildProcess | null = null

  /** Информация о внешнем IPFS Desktop */
  private externalInfo: IpfsDesktopInfo | null = null

  /** PeerId ноды */
  private peerId: string | null = null

  /** Версия Kubo */
  private version: string | null = null

  /** Флаг инициализации */
  private isInitializing = false

  /** Флаг shutdown */
  private isShuttingDown = false

  /** Интервал проверки здоровья */
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null

  /** Интервал обновления статуса пиров */
  private peerCountInterval: ReturnType<typeof setInterval> | null = null
  private statsInterval: ReturnType<typeof setInterval> | null = null

  /** Интервал heartbeat регистрации на relay */
  private relayHeartbeatInterval: ReturnType<typeof setInterval> | null = null

  /** Интервал мониторинга relay reservation */
  private relayMonitorInterval: ReturnType<typeof setInterval> | null = null

  /** Количество подключённых пиров */
  private connectedPeers = 0

  /** Кэш размера репо (обновляется каждые 30 сек вместе с peer count) */
  private cachedBlockstoreSize = 0

  /** Путь к папке библиотеки (задаётся при initialize) */
  private libraryPath: string | null = null

  /** Максимальный размер IPFS хранилища в ГБ */
  private storageMaxGb = 500

  /** Текущие порты (для embedded режима, могут отличаться от дефолтных если заняты) */
  private currentPorts: KuboCurrentPorts = {
    api: KUBO_PORTS.api,
    gateway: KUBO_PORTS.gateway,
    swarmTcp: KUBO_PORTS.swarmTcp,
    swarmQuic: KUBO_PORTS.swarmQuic,
  }

  private constructor() {
    super()
  }

  /**
   * Получить singleton экземпляр
   */
  static getInstance(): KuboService {
    if (!KuboService.instance) {
      KuboService.instance = new KuboService()
    }
    return KuboService.instance
  }

  /**
   * Инициализировать KuboService
   *
   * 1. Проверяет IPFS Desktop → использует если есть
   * 2. Иначе запускает embedded Kubo
   */
  async initialize(opts?: { libraryPath?: string | null; storageMaxGb?: number }): Promise<void> {
    if (opts?.libraryPath !== undefined) this.libraryPath = opts.libraryPath ?? null
    if (opts?.storageMaxGb !== undefined) this.storageMaxGb = opts.storageMaxGb
    if (this.client) {
      log.info('Уже инициализирован', { mode: this.mode })
      return
    }

    if (this.isInitializing) {
      log.info('Инициализация уже в процессе')
      return
    }

    this.isInitializing = true

    try {
      log.info('Начинаю инициализацию...')

      // Проверяем IPFS Desktop
      const externalInfo = await detectIpfsDesktop()

      if (externalInfo) {
        // Используем внешний IPFS Desktop
        await this.connectToExternal(externalInfo)
      } else {
        // Запускаем embedded Kubo
        await this.startEmbedded()
      }

      // Запускаем периодические проверки
      this.startHealthCheck()
      this.startPeerCountUpdates()

      // Регистрация на relay (не блокирует запуск)
      registerWithRelay(this.peerId).catch((err) => {
        log.warn('Первичная регистрация на relay не удалась', { error: String(err) })
      })
      this.relayHeartbeatInterval = createRelayHeartbeat(() => this.peerId)

      // Мониторинг relay reservation — восстанавливает если ConnMgr прунит соединение.
      // При длительной потере (autorelay backoff) перезапускает Kubo для сброса backoff.
      this.relayMonitorInterval = createRelayMonitor(() => this.getApiUrl(), {
        onRestartNeeded: () => this.restartKuboForRelay(),
      })

      // PeerSync — periodic refresh (10 мин) + reconnect cycle (30 мин)
      // КРИТИЧНО: reconnect cycle заменяет pin-queue логику на пиннерах,
      // без него desktop bitswap зависает (Recv=0, см. task #229)
      const apiUrl = this.getApiUrl()
      if (apiUrl) {
        const { getPeerSyncService } = await import('./peer-sync-service')
        getPeerSyncService()
          .initialize(apiUrl)
          .catch((err) => {
            log.warn('PeerSyncService initialize failed', { error: String(err) })
          })
      }

      log.info('Инициализация завершена', {
        mode: this.mode,
        peerId: this.peerId?.slice(-8),
      })

      this.emitStatusChanged()
    } catch (error) {
      log.error('Ошибка инициализации', { error: String(error) })
      this.emit('error', error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      this.isInitializing = false
    }
  }

  /**
   * Подключиться к внешнему IPFS Desktop
   */
  private async connectToExternal(info: IpfsDesktopInfo): Promise<void> {
    log.info('Подключаюсь к IPFS Desktop...', { peerId: info.peerId.slice(-8) })

    // Динамический импорт kubo-rpc-client (ESM модуль)
    const { create } = await import('kubo-rpc-client')

    this.client = create({ url: info.apiUrl })
    this.mode = 'external'
    this.externalInfo = info
    this.peerId = info.peerId
    this.version = info.version

    log.info('Подключён к IPFS Desktop', {
      peerId: info.peerId.slice(-8),
      version: info.version,
    })
  }

  /**
   * Запустить embedded Kubo
   */
  private async startEmbedded(): Promise<void> {
    log.info('Запускаю embedded Kubo...')

    const kuboBin = getKuboBinaryPath()
    log.info('Путь к Kubo бинарнику', { kuboBin })

    await validateKuboBinary(kuboBin)

    const repoPath = getKuboRepoPath(this.libraryPath)
    this.currentPorts = await prepareKuboRepo(kuboBin, repoPath, this.storageMaxGb)

    // Регистрируем PeerId на relay ДО запуска демона
    // AutoRelay пытается reservation сразу при старте — ACL должен быть готов
    try {
      const repoConfig = JSON.parse(
        await import('fs').then((fs) => fs.promises.readFile(`${repoPath}/config`, 'utf-8')),
      )
      const configPeerId = repoConfig?.Identity?.PeerID
      if (configPeerId) {
        await registerWithRelay(configPeerId)
        log.info('Pre-registration на relay перед запуском Kubo', { peerId: configPeerId.slice(-8) })
      }
    } catch (err) {
      log.warn('Pre-registration на relay не удалась', { error: String(err) })
    }

    // Запускаем Kubo демон через spawn
    log.info('Запускаю Kubo демон через spawn...', { repoPath })
    this.kuboProcess = await spawnKuboDaemon(kuboBin, repoPath)

    // Динамический импорт kubo-rpc-client
    const { create } = await import('kubo-rpc-client')

    // Создаём клиент вручную
    const apiUrl = `http://127.0.0.1:${this.currentPorts.api}`
    log.debug('Создаю RPC клиент...', { apiUrl })

    // Используем globalThis.fetch (Node.js undici) вместо net.fetch (Electron)
    // undici имеет connection pooling — переиспользует TCP соединения
    // net.fetch создаёт новый сокет на каждый запрос → утечка NonPaged Pool
    this.client = create({ url: apiUrl })

    // Получаем информацию о ноде
    log.debug('Получаю информацию о ноде...')
    const id = await this.client.id()
    this.peerId = id.id.toString()

    // Получаем версию
    const versionInfo = await this.client.version()
    this.version = versionInfo.version

    this.mode = 'embedded'

    log.info('Embedded Kubo запущен', {
      peerId: this.peerId.slice(-8),
      version: this.version,
      apiPort: this.currentPorts.api,
      gatewayPort: this.currentPorts.gateway,
    })
  }

  /**
   * Остановить KuboService
   */
  async shutdown(): Promise<void> {
    if (!this.client) {
      log.info('Сервис не запущен')
      return
    }

    if (this.isShuttingDown) {
      log.info('Shutdown уже в процессе')
      return
    }

    this.isShuttingDown = true

    try {
      log.info('Начинаю shutdown...', { mode: this.mode })

      // Останавливаем интервалы
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
        this.healthCheckInterval = null
      }

      if (this.statsInterval) {
        clearInterval(this.statsInterval)
        this.statsInterval = null
      }
      if (this.peerCountInterval) {
        clearInterval(this.peerCountInterval)
        this.peerCountInterval = null
      }

      if (this.relayHeartbeatInterval) {
        stopRelayHeartbeat(this.relayHeartbeatInterval)
        this.relayHeartbeatInterval = null
      }

      stopRelayMonitor(this.relayMonitorInterval)
      this.relayMonitorInterval = null

      // Останавливаем PeerSyncService (periodic refresh + reconnect cycle)
      try {
        const { getPeerSyncService } = await import('./peer-sync-service')
        getPeerSyncService().shutdown()
      } catch (err) {
        log.warn('PeerSyncService shutdown failed', { error: String(err) })
      }

      // Для embedded режима — останавливаем демон
      if (this.mode === 'embedded' && this.kuboProcess) {
        log.info('Останавливаю embedded Kubo...')
        // Graceful shutdown через SIGTERM
        this.kuboProcess.kill('SIGTERM')

        // Ждём завершения процесса (максимум 5 секунд)
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => {
            // Если не завершился за 5 сек — SIGKILL
            log.warn('Kubo не завершился за 5 сек, принудительное завершение...')
            this.kuboProcess?.kill('SIGKILL')
            resolve()
          }, 5000)

          this.kuboProcess?.on('close', () => {
            clearTimeout(timeout)
            resolve()
          })
        })

        this.kuboProcess = null
      }

      // Для external режима — просто отключаемся
      this.client = null
      this.mode = 'none'
      this.peerId = null
      this.version = null
      this.externalInfo = null
      this.connectedPeers = 0

      log.info('Shutdown завершён')
      this.emitStatusChanged()
    } catch (error) {
      log.error('Ошибка shutdown', { error: String(error) })
      this.emit('error', error instanceof Error ? error : new Error(String(error)))
      throw error
    } finally {
      this.isShuttingDown = false
    }
  }

  /**
   * Получить Kubo RPC клиент
   *
   * @throws Error если клиент не инициализирован
   */
  getClient(): KuboRPCClient {
    if (!this.client) {
      throw new Error('KuboService не инициализирован. Вызовите initialize() сначала.')
    }
    return this.client
  }

  /**
   * Получить Kubo RPC клиент или null
   */
  getClientOrNull(): KuboRPCClient | null {
    return this.client
  }

  /**
   * Получить текущий статус
   */
  getStatus(): KuboServiceStatus {
    return {
      isRunning: this.client !== null,
      mode: this.mode,
      peerId: this.peerId,
      apiUrl: this.getApiUrl(),
      gatewayPort: this.getGatewayPort(),
      version: this.version,
      connectedPeers: this.connectedPeers,
    }
  }

  /**
   * Получить расширенный статус для UI (с трафиком и размером репо)
   */
  async getIpfsStatus(): Promise<IpfsServiceStatus> {
    return getIpfsStatus({
      client: this.client,
      peerId: this.peerId,
      connectedPeers: this.connectedPeers,
      apiUrl: this.getApiUrl(),
    })
  }

  /**
   * Получить диагностику P2P соединений
   */
  async getDiagnostics(): Promise<P2PDiagnostics | null> {
    if (!this.client) {
      return null
    }

    try {
      const peers = await this.client.swarm.peers()
      let inbound = 0
      let outbound = 0
      const byTransport = { tcp: 0, quic: 0, relay: 0, ws: 0 }

      for (const peer of peers) {
        const addr = peer.addr.toString()
        if (peer.direction === 'inbound') {
          inbound++
        } else {
          outbound++
        }

        if (addr.includes('/p2p-circuit/')) {
          byTransport.relay++
        } else if (addr.includes('/quic') || addr.includes('/quic-v1')) {
          byTransport.quic++
        } else if (addr.includes('/ws/') || addr.includes('/wss/')) {
          byTransport.ws++
        } else {
          byTransport.tcp++
        }
      }

      // Получаем адреса
      let listenAddrs: string[] = []
      const observedAddrs: string[] = []
      const apiUrl = this.getApiUrl()
      if (apiUrl) {
        try {
          const res = await fetch(`${apiUrl}/api/v0/id`, {
            method: 'POST',
            signal: AbortSignal.timeout(5000),
          })
          if (res.ok) {
            const idData = (await res.json()) as { Addresses?: string[]; AgentVersion?: string }
            listenAddrs = idData.Addresses ?? []
          }
        } catch {
          // Игнорируем
        }
      }

      return {
        totalPeers: peers.length,
        inbound,
        outbound,
        byTransport,
        listenAddrs,
        observedAddrs,
      }
    } catch (error) {
      log.debug('Не удалось получить диагностику', { error: String(error) })
      return null
    }
  }

  /**
   * Получить URL API
   */
  getApiUrl(): string | null {
    if (!this.client) {
      return null
    }

    if (this.mode === 'external' && this.externalInfo) {
      return this.externalInfo.apiUrl
    }

    return `http://127.0.0.1:${this.currentPorts.api}`
  }

  /**
   * Получить порт Gateway
   */
  getGatewayPort(): number | null {
    if (!this.client) {
      return null
    }

    if (this.mode === 'external' && this.externalInfo) {
      return this.externalInfo.gatewayPort
    }

    return this.currentPorts.gateway
  }

  /**
   * Получить URL Gateway
   */
  getGatewayUrl(): string | null {
    const port = this.getGatewayPort()
    if (!port) {
      return null
    }
    return `http://127.0.0.1:${port}`
  }

  /**
   * Проверить, запущен ли сервис
   */
  isRunning(): boolean {
    return this.client !== null
  }

  /**
   * Получить режим работы
   */
  getMode(): KuboMode {
    return this.mode
  }

  /**
   * Получить PeerId
   */
  getPeerId(): string | null {
    return this.peerId
  }

  // === Периодические задачи ===

  /**
   * Запустить периодическую проверку здоровья
   */
  private startHealthCheck(): void {
    // Проверка каждые 30 секунд
    this.healthCheckInterval = setInterval(async () => {
      const result = await checkHealth({ client: this.client, mode: this.mode })
      if (result.needsReconnect) {
        await this.reconnect()
      }
    }, 30000)
  }

  /**
   * Переподключение к IPFS после потери связи или выхода из спящего режима
   *
   * Для external: проверяет доступность, пересоздаёт RPC клиент
   * Для embedded: проверяет процесс, при необходимости перезапускает демон
   */
  async reconnect(): Promise<void> {
    if (this.isShuttingDown) {
      return
    }

    log.info('Переподключение IPFS...', { mode: this.mode })

    try {
      if (this.mode === 'external' && this.externalInfo) {
        // Проверяем доступность внешнего IPFS Desktop
        const alive = await isIpfsDesktopAlive()
        if (alive) {
          // Пересоздаём RPC клиент
          const { create } = await import('kubo-rpc-client')
          this.client = create({ url: this.externalInfo.apiUrl })
          const id = await this.client.id()
          this.peerId = id.id.toString()
          log.info('Переподключение к IPFS Desktop успешно', { peerId: this.peerId?.slice(-8) })
        } else {
          log.warn('IPFS Desktop недоступен после reconnect')
        }
      } else if (this.mode === 'embedded') {
        // Проверяем что процесс Kubo жив
        const apiAvailable = await checkApiAvailable(this.currentPorts.api, 3)

        if (apiAvailable) {
          // API доступен — пересоздаём RPC клиент
          const { create } = await import('kubo-rpc-client')
          const apiUrl = `http://127.0.0.1:${this.currentPorts.api}`
          this.client = create({ url: apiUrl })
          const id = await this.client.id()
          this.peerId = id.id.toString()
          log.info('Переподключение к embedded Kubo успешно', { peerId: this.peerId?.slice(-8) })
        } else if (this.kuboProcess && !this.kuboProcess.killed) {
          // Процесс жив, но API не отвечает — ждём восстановления
          log.warn('Embedded Kubo API не отвечает, процесс жив — ждём')
          // Повторная проверка через увеличенный таймаут
          const recovered = await checkApiAvailable(this.currentPorts.api, 10)
          if (recovered) {
            const { create } = await import('kubo-rpc-client')
            this.client = create({ url: `http://127.0.0.1:${this.currentPorts.api}` })
            log.info('Embedded Kubo восстановился после ожидания')
          } else {
            log.error('Embedded Kubo не восстановился — перезапуск')
            await this.restartEmbedded()
          }
        } else {
          // Процесс мёртв — перезапускаем
          log.warn('Embedded Kubo процесс мёртв — перезапуск')
          await this.restartEmbedded()
        }
      }

      this.emitStatusChanged()
    } catch (error) {
      log.error('Ошибка переподключения', { error: String(error) })
      this.emit('error', error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Перезапустить embedded Kubo демон
   */
  private async restartEmbedded(): Promise<void> {
    // Убиваем старый процесс если есть
    if (this.kuboProcess) {
      this.kuboProcess.kill('SIGKILL')
      this.kuboProcess = null
    }
    this.client = null

    // Перезапускаем
    const kuboBin = getKuboBinaryPath()
    const repoPath = getKuboRepoPath(this.libraryPath)

    this.kuboProcess = await spawnKuboDaemon(kuboBin, repoPath)

    const { create } = await import('kubo-rpc-client')
    const apiUrl = `http://127.0.0.1:${this.currentPorts.api}`
    this.client = create({ url: apiUrl })

    const id = await this.client.id()
    this.peerId = id.id.toString()
    this.mode = 'embedded'

    log.info('Embedded Kubo перезапущен', { peerId: this.peerId?.slice(-8) })
  }

  /**
   * Перезапустить Kubo для сброса autorelay backoff при потере relay reservation.
   *
   * Вызывается KuboRelay монитором когда swarm connect не восстанавливает
   * резервацию — это признак autorelay exponential backoff. Единственный
   * способ сбросить backoff — перезапустить Kubo процесс.
   *
   * Последовательность:
   * 1. Перерегистрируемся на relay до рестарта (актуализируем TTL в whitelist)
   * 2. Перезапускаем Kubo (сбрасывает in-memory autorelay backoff)
   * 3. Перерегистрируемся с новым peerId после рестарта
   */
  async restartKuboForRelay(): Promise<void> {
    if (this.mode !== 'embedded' || this.isShuttingDown) {
      log.debug('restartKuboForRelay пропущен', {
        mode: this.mode,
        isShuttingDown: this.isShuttingDown,
      })
      return
    }

    log.warn('Перезапуск Kubo для сброса autorelay backoff...')

    // Шаг 1: регистрируемся ДО рестарта (чтобы whitelist был актуален при старте)
    await registerWithRelay(this.peerId).catch((err) => {
      log.warn('Pre-restart relay registration не удалась', { error: String(err) })
    })

    // Шаг 2: перезапускаем Kubo (очищает autorelay backoff)
    try {
      await this.restartEmbedded()
    } catch (error) {
      log.error('Ошибка рестарта Kubo для relay', { error: String(error) })
      this.emit('error', error instanceof Error ? error : new Error(String(error)))
      return
    }

    // Шаг 3: регистрируемся с новым peerId после рестарта
    await registerWithRelay(this.peerId).catch((err) => {
      log.warn('Post-restart relay registration не удалась', { error: String(err) })
    })

    this.emitStatusChanged()
    log.info('Kubo перезапущен, relay registration обновлена', {
      peerId: this.peerId?.slice(-8),
    })
  }

  /**
   * Запустить обновление количества пиров
   */
  private startPeerCountUpdates(): void {
    // Peer count каждые 30 секунд (swarm.peers() тяжёлый)
    this.peerCountInterval = setInterval(async () => {
      await this.doUpdatePeerCount()
    }, 30000)

    // Bandwidth + repo stats каждую секунду (лёгкие HTTP запросы)
    this.statsInterval = setInterval(() => {
      this.emitStatusChanged()
    }, 1000)

    // Первое обновление сразу
    this.doUpdatePeerCount()
  }

  /**
   * Обновить количество пиров (делегация в kubo-stats)
   */
  private async doUpdatePeerCount(): Promise<void> {
    const result = await updatePeerCount(this.client, this.getApiUrl(), this.connectedPeers, this.cachedBlockstoreSize)
    this.connectedPeers = result.count
    this.cachedBlockstoreSize = result.cachedBlockstoreSize
  }

  /**
   * Эмитить событие с актуальным bandwidth (вызывается каждую секунду)
   *
   * stats/bw — лёгкий запрос (~1ms). repo/stat — тяжёлый, используем кэш.
   */
  private emitStatusChanged(): void {
    getBandwidthOnly(this.getApiUrl())
      .then((bw) => {
        this.emit('status:changed', {
          isRunning: this.client !== null,
          peerId: this.peerId,
          connectedPeers: this.connectedPeers,
          bytesIn: bw.bytesIn,
          bytesOut: bw.bytesOut,
          blockstoreSize: this.cachedBlockstoreSize,
          natStatus: 'unknown' as const,
        })
      })
      .catch(() => {
        // Молча игнорируем — следующий тик обновит
      })
  }
}

/**
 * Получить singleton экземпляр KuboService
 */
export function getKuboService(): KuboService {
  return KuboService.getInstance()
}
