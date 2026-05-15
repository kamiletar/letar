/**
 * Stats Tracker — Трекер статистики IPFS
 *
 * Отслеживает события от Kubo ноды и обновляет статистику.
 * Эмитит события для других сервисов (reputation, achievements, bonus).
 */

import { EventEmitter } from 'events'

import type { StatsUpdatedEvent, UserStats } from '../../../shared/types/stats'
import { createModuleLogger } from '../../utils/logger'
import { getKuboService } from '../kubo'
import * as statsStore from './stats-store'

const log = createModuleLogger('StatsTracker')

/**
 * События трекера
 */
export interface StatsTrackerEvents {
  'stats:updated': (event: StatsUpdatedEvent) => void
  'stats:sessionStarted': () => void
  'stats:sessionEnded': () => void
}

/**
 * Интервал обновления времени сессии (1 минута)
 */
const SESSION_UPDATE_INTERVAL = 60 * 1000

/**
 * Интервал сохранения статистики (5 минут)
 */
const STATS_SAVE_INTERVAL = 5 * 60 * 1000

/**
 * Трекер статистики IPFS
 */
class StatsTracker extends EventEmitter {
  private static instance: StatsTracker | null = null

  /** Время начала текущей сессии */
  private sessionStartTime: number | null = null

  /** Интервал обновления сессии */
  private sessionInterval: NodeJS.Timeout | null = null

  /** Интервал периодического сохранения */
  private saveInterval: NodeJS.Timeout | null = null

  /** Флаг инициализации */
  private isInitialized = false

  /** Счётчик байт за текущий интервал */
  private pendingBytesUp = 0
  private pendingBytesDown = 0

  /** Предыдущие значения bandwidth для вычисления дельты */
  private prevBytesIn = 0
  private prevBytesOut = 0

  /** Интервал опроса Bitswap peers */
  private bitswapPollInterval: NodeJS.Timeout | null = null

  /** Время запуска приложения (для расчёта аптайма) */
  private appStartTime = Date.now()
  /** Таймер трекинга аптайма */
  private uptimeInterval: NodeJS.Timeout | null = null

  /** Cleanup для подписок на PinManager (предотвращение утечки при переинициализации) */
  private pinListenerCleanup: (() => void) | null = null

  private constructor() {
    super()
  }

  /**
   * Получить singleton экземпляр
   */
  static getInstance(): StatsTracker {
    if (!StatsTracker.instance) {
      StatsTracker.instance = new StatsTracker()
    }
    return StatsTracker.instance
  }

  /**
   * Инициализировать трекер
   */
  initialize(): void {
    if (this.isInitialized) {
      log.info('Уже инициализирован')
      return
    }

    log.info('Инициализация...')

    // Подписываемся на события Kubo
    this.subscribeToKuboEvents()

    // Запускаем периодическое сохранение
    this.startPeriodicSave()

    // Запускаем трекинг аптайма (раз в 5 минут сохраняем в stats)
    this.startUptimeTracking()

    // Обновляем количество pinned контента при старте и при pin/unpin
    this.updatePinnedContentCount()
    import('../ipfs')
      .then(({ getPinManager }) => {
        const pm = getPinManager()
        const onPinChange = () => this.updatePinnedContentCount()
        pm.on('pinned', onPinChange)
        pm.on('unpinned', onPinChange)
        // Сохраняем cleanup для корректной отписки в shutdown()
        this.pinListenerCleanup = () => {
          pm.off('pinned', onPinChange)
          pm.off('unpinned', onPinChange)
        }
      })
      .catch(() => {
        /* игнорируем */
      })

    this.isInitialized = true
    log.info('Инициализация завершена')
  }

  /**
   * Остановить трекер
   */
  shutdown(): void {
    log.info('Остановка...')

    // Останавливаем интервалы
    if (this.sessionInterval) {
      clearInterval(this.sessionInterval)
      this.sessionInterval = null
    }

    if (this.saveInterval) {
      clearInterval(this.saveInterval)
      this.saveInterval = null
    }

    this.stopBitswapPolling()
    this.stopUptimeTracking()

    // Отписываемся от PinManager событий
    this.pinListenerCleanup?.()
    this.pinListenerCleanup = null

    // Сохраняем накопленные данные
    this.flushPendingStats()

    // Завершаем сессию
    if (this.sessionStartTime) {
      this.endSession()
    }

    this.isInitialized = false
    log.info('Остановлен')
  }

  /**
   * Подписаться на события Kubo
   */
  private subscribeToKuboEvents(): void {
    const kuboService = getKuboService()

    // При изменении статуса ноды — трекаем сессию + bandwidth
    kuboService.on('status:changed', (status) => {
      if (status.isRunning && !this.sessionStartTime) {
        this.startSession()
        // Инициализируем начальные значения для дельт
        this.prevBytesIn = status.bytesIn ?? 0
        this.prevBytesOut = status.bytesOut ?? 0
        // Запускаем опрос Bitswap peers
        this.startBitswapPolling()
      } else if (!status.isRunning && this.sessionStartTime) {
        this.endSession()
        this.prevBytesIn = 0
        this.prevBytesOut = 0
        this.stopBitswapPolling()
      } else if (status.isRunning) {
        // Вычисляем дельту трафика из кумулятивных bytesIn/bytesOut
        const bytesIn = status.bytesIn ?? 0
        const bytesOut = status.bytesOut ?? 0

        if (this.prevBytesIn > 0 && bytesIn > this.prevBytesIn) {
          this.pendingBytesDown += bytesIn - this.prevBytesIn
        }
        if (this.prevBytesOut > 0 && bytesOut > this.prevBytesOut) {
          this.pendingBytesUp += bytesOut - this.prevBytesOut
        }

        this.prevBytesIn = bytesIn
        this.prevBytesOut = bytesOut
      }
    })
  }

  /**
   * Начать сессию раздачи
   */
  startSession(): void {
    if (this.sessionStartTime) {
      log.info('Сессия уже активна')
      return
    }

    this.sessionStartTime = Date.now()
    statsStore.resetCurrentSession()

    // Запускаем обновление времени сессии
    this.sessionInterval = setInterval(() => {
      if (this.sessionStartTime) {
        const elapsed = Date.now() - this.sessionStartTime
        statsStore.updateCurrentSession(elapsed)
      }
    }, SESSION_UPDATE_INTERVAL)

    this.emit('stats:sessionStarted')
    log.info('Сессия начата')
  }

  /**
   * Завершить сессию раздачи
   */
  endSession(): void {
    if (!this.sessionStartTime) {
      log.info('Нет активной сессии')
      return
    }

    // Добавляем время сессии к общему
    const sessionDuration = Date.now() - this.sessionStartTime
    statsStore.addSeedingTime(sessionDuration)

    // Очищаем
    this.sessionStartTime = null
    if (this.sessionInterval) {
      clearInterval(this.sessionInterval)
      this.sessionInterval = null
    }

    statsStore.resetCurrentSession()

    this.emit('stats:sessionEnded')
    log.info(`Сессия завершена (${Math.round(sessionDuration / 1000 / 60)} мин)`)
  }

  /**
   * Запустить периодическое сохранение
   */
  private startPeriodicSave(): void {
    this.saveInterval = setInterval(() => {
      this.flushPendingStats()
    }, STATS_SAVE_INTERVAL)
  }

  /**
   * Сохранить накопленную статистику
   */
  private flushPendingStats(): void {
    let stats = statsStore.loadStats()
    let hasChanges = false

    if (this.pendingBytesUp > 0) {
      stats = statsStore.addBytesUploaded(this.pendingBytesUp)
      this.pendingBytesUp = 0
      hasChanges = true
    }

    if (this.pendingBytesDown > 0) {
      stats = statsStore.addBytesDownloaded(this.pendingBytesDown)
      this.pendingBytesDown = 0
      hasChanges = true
    }

    if (hasChanges) {
      this.emitStatsUpdated(stats)
    }
  }

  /**
   * Отслеживать байты upload (вызывается из IPFS)
   */
  trackBytesUploaded(bytes: number): void {
    this.pendingBytesUp += bytes
  }

  /**
   * Отслеживать байты download (вызывается из IPFS)
   */
  trackBytesDownloaded(bytes: number): void {
    this.pendingBytesDown += bytes
  }

  /**
   * Запустить периодический опрос Bitswap peers (каждые 5 минут)
   */
  private startBitswapPolling(): void {
    if (this.bitswapPollInterval) {
      return
    }

    // Первый опрос сразу
    this.pollBitswapPeers().catch(() => {
      /* игнорируем */
    })

    this.bitswapPollInterval = setInterval(() => {
      this.pollBitswapPeers().catch((err) => {
        log.error('Ошибка опроса Bitswap peers', { error: String(err) })
      })
    }, STATS_SAVE_INTERVAL) // Раз в 5 минут — совпадает с интервалом сохранения
  }

  /**
   * Остановить опрос Bitswap peers
   */
  private stopBitswapPolling(): void {
    if (this.bitswapPollInterval) {
      clearInterval(this.bitswapPollInterval)
      this.bitswapPollInterval = null
    }
  }

  /**
   * Опросить Kubo API для получения активных Bitswap пиров
   */
  private async pollBitswapPeers(): Promise<void> {
    const kuboService = getKuboService()
    const apiUrl = kuboService.getApiUrl()
    if (!apiUrl) {
      return
    }

    try {
      const response = await fetch(`${apiUrl}/api/v0/bitswap/stat`, {
        method: 'POST',
      })

      if (!response.ok) {
        return
      }

      const data = (await response.json()) as { Peers?: string[] }
      const peers = data.Peers
      if (!Array.isArray(peers) || peers.length === 0) {
        return
      }

      const { stats, newCount } = statsStore.addBitswapPeers(peers)
      if (newCount > 0) {
        log.debug('Новые Bitswap пиры', { newCount, total: stats.peersHelped })
        this.emitStatsUpdated(stats)
      }
    } catch {
      // Kubo может быть недоступен — игнорируем
    }
  }

  /**
   * Запустить трекинг аптайма (периодическое сохранение в stats)
   */
  private startUptimeTracking(): void {
    if (this.uptimeInterval) {
      return
    }

    let lastUptimeSave = Date.now()

    this.uptimeInterval = setInterval(() => {
      const now = Date.now()
      const elapsed = now - lastUptimeSave
      lastUptimeSave = now
      statsStore.addUptime(elapsed)
    }, STATS_SAVE_INTERVAL) // Раз в 5 минут
  }

  /**
   * Остановить трекинг аптайма
   */
  private stopUptimeTracking(): void {
    if (this.uptimeInterval) {
      clearInterval(this.uptimeInterval)
      this.uptimeInterval = null
    }
  }

  /**
   * Обновить количество уникального контента
   */
  updateUniqueContentCount(count: number): void {
    const stats = statsStore.setUniqueContentCount(count)
    this.emitStatsUpdated(stats)
  }

  /**
   * Обновить количество pinned контента (уникальных CID)
   */
  private async updatePinnedContentCount(): Promise<void> {
    try {
      const { getPinManager } = await import('../ipfs')
      const stats = await getPinManager().getStats()
      this.updateUniqueContentCount(stats.count)
    } catch {
      // PinManager может быть ещё не готов
    }
  }

  /**
   * Получить текущую статистику
   */
  getStats(): UserStats {
    const stats = statsStore.loadStats()
    // Не отправляем тяжёлый массив peers в renderer — только число peersHelped
    return { ...stats, knownBitswapPeers: [] }
  }

  /**
   * Получить историю по дням
   */
  getDailyHistory(days = 30) {
    return statsStore.getDailyHistory(days)
  }

  /**
   * Эмитить событие обновления статистики
   */
  private emitStatsUpdated(stats: UserStats): void {
    // Не отправляем тяжёлый массив knownBitswapPeers через IPC — только число peersHelped
    const { knownBitswapPeers: _peers, ...lightStats } = stats
    const event: StatsUpdatedEvent = {
      stats: { ...lightStats, knownBitswapPeers: [] } as UserStats,
      delta: {},
    }
    this.emit('stats:updated', event)
  }
}

/**
 * Получить singleton экземпляр StatsTracker
 */
export function getStatsTracker(): StatsTracker {
  return StatsTracker.getInstance()
}
