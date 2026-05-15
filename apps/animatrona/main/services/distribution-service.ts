/**
 * DistributionService — Управление раздачами на трекере
 *
 * Регистрирует одну раздачу на аниме (по directoryCid),
 * отправляет периодический heartbeat, статистику и уведомляет трекер при shutdown.
 */

import type { TrackerConfig, TrackerDistribution } from '../../shared/types/tracker'
import { createConfigStore } from '../utils/config-store'
import { prisma } from '../utils/db'
import { createModuleLogger } from '../utils/logger'
import { getKuboService } from './kubo'
import { getUnreportedDelta, markReported } from './stats/stats-store'
import { fetchTrackerCatalog, registerDistribution, reportStats, updateDistribution } from './tracker-client'

const log = createModuleLogger('DistributionService')

/** Интервал heartbeat — 30 минут */
const HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000

/** Интервал отправки статистики — 10 минут */
const STATS_REPORT_INTERVAL_MS = 10 * 60 * 1000

/** Config store для tracker (shared с tracker.handlers.ts) */
const trackerConfigStore = createConfigStore<TrackerConfig>('tracker-config.json', {
  baseUrl: 'https://animatrona-tracker.letar.best',
  apiKey: '',
  enabled: false,
})

/** Загрузить конфигурацию трекера, null если не настроен */
async function loadTrackerConfig(): Promise<TrackerConfig | null> {
  const config = await trackerConfigStore.load()
  if (!config.enabled || !config.apiKey) {
    return null
  }
  return config
}

export class DistributionService {
  private static instance: DistributionService | null = null

  /** Зарегистрированные раздачи: directoryCid → TrackerDistribution */
  private distributions = new Map<string, TrackerDistribution>()
  /** Таймер heartbeat */
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  /** Таймер отправки статистики */
  private statsTimer: ReturnType<typeof setInterval> | null = null
  /** Инициализирован ли сервис */
  private initialized = false

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- singleton pattern
  private constructor() {}

  static getInstance(): DistributionService {
    if (!DistributionService.instance) {
      DistributionService.instance = new DistributionService()
    }
    return DistributionService.instance
  }

  /**
   * Инициализация — регистрирует раздачи по directoryCid аниме,
   * запускает heartbeat и таймер отправки статистики.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }
    this.initialized = true

    const config = await loadTrackerConfig()
    if (!config) {
      log.info('Трекер не настроен или отключён, пропускаем регистрацию раздач')
      return
    }

    const kuboService = getKuboService()
    const peerId = kuboService.getPeerId()
    if (!peerId) {
      log.warn('PeerId недоступен, пропускаем регистрацию раздач')
      return
    }

    // Регистрируем раздачи по directoryCid аниме
    await this.registerAllDistributions(config, peerId)

    // Запускаем heartbeat
    this.startHeartbeat()

    // Запускаем таймер отправки статистики
    this.startStatsReporting()

    log.info('DistributionService инициализирован', {
      distributions: this.distributions.size,
    })
  }

  /**
   * Зарегистрировать раздачи по directoryCid для всех аниме с запиненным контентом.
   * Загружает каталог трекера для определения animeId по directoryCid.
   */
  private async registerAllDistributions(config: TrackerConfig, peerId: string): Promise<void> {
    try {
      // Загружаем все аниме с directoryCid из локальной БД
      const animeList = await prisma.anime.findMany({
        where: { directoryCid: { not: null } },
        select: { id: true, directoryCid: true, directorySize: true, name: true },
      })

      if (animeList.length === 0) {
        return
      }

      // Загружаем каталог трекера для маппинга directoryCid → animeId
      const trackerAnimeMap = await this.buildTrackerAnimeMap(config)

      log.info('Регистрируем раздачи по directoryCid', {
        count: animeList.length,
        trackerMatches: trackerAnimeMap.size,
      })

      for (const anime of animeList) {
        if (!anime.directoryCid) {
          continue
        }

        const trackerAnimeId = trackerAnimeMap.get(anime.directoryCid)

        const result = await registerDistribution(config, {
          cid: anime.directoryCid,
          peerId,
          size: anime.directorySize ?? undefined,
          animeId: trackerAnimeId,
        })

        if (result.success && result.distribution) {
          this.distributions.set(anime.directoryCid, result.distribution)
        } else {
          log.warn('Не удалось зарегистрировать раздачу', {
            anime: anime.name?.slice(0, 30),
            error: result.error,
          })
        }
      }

      log.info('Зарегистрировано раздач', { count: this.distributions.size })
    } catch (error) {
      log.error('Ошибка регистрации раздач', { error: String(error) })
    }
  }

  /**
   * Загрузить каталог трекера и построить маппинг directoryCid → animeId
   */
  private async buildTrackerAnimeMap(config: TrackerConfig): Promise<Map<string, string>> {
    const map = new Map<string, string>()
    try {
      const result = await fetchTrackerCatalog(config, { limit: 1000 })
      if (result.success && result.data) {
        for (const anime of result.data) {
          if (anime.directoryCid) {
            map.set(anime.directoryCid, anime.id)
          }
        }
      }
    } catch (error) {
      log.warn('Не удалось загрузить каталог трекера для маппинга animeId', { error: String(error) })
    }
    return map
  }

  /**
   * Запустить периодический heartbeat
   */
  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      return
    }

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat().catch((err) => {
        log.error('Ошибка heartbeat', { error: String(err) })
      })
    }, HEARTBEAT_INTERVAL_MS)

    log.info('Heartbeat запущен', { intervalMs: HEARTBEAT_INTERVAL_MS })
  }

  /**
   * Отправить heartbeat для всех активных раздач
   */
  private async sendHeartbeat(): Promise<void> {
    if (this.distributions.size === 0) {
      return
    }

    const config = await loadTrackerConfig()
    if (!config) {
      return
    }

    let updated = 0
    for (const [cid, dist] of this.distributions) {
      const result = await updateDistribution(config, dist.id, { status: 'ACTIVE' })
      if (result.success) {
        updated++
      } else {
        log.warn('Heartbeat не удался', { cid: cid.slice(0, 16), error: result.error })
      }
    }

    log.debug('Heartbeat отправлен', { total: this.distributions.size, updated })
  }

  /**
   * Запустить таймер отправки статистики на трекер (каждые 10 минут)
   */
  private startStatsReporting(): void {
    if (this.statsTimer) {
      return
    }

    this.statsTimer = setInterval(() => {
      this.sendStatsReport().catch((err) => {
        log.error('Ошибка отправки статистики', { error: String(err) })
      })
    }, STATS_REPORT_INTERVAL_MS)

    log.info('Таймер статистики запущен', { intervalMs: STATS_REPORT_INTERVAL_MS })
  }

  /**
   * Отправить отчёт о статистике на трекер
   */
  private async sendStatsReport(): Promise<void> {
    const config = await loadTrackerConfig()
    if (!config) {
      return
    }

    const kuboService = getKuboService()
    const peerId = kuboService.getPeerId()
    if (!peerId) {
      return
    }

    const delta = getUnreportedDelta(this.distributions.size)

    // Не отправляем если нет изменений
    if (
      delta.bytesUploaded === 0
      && delta.bytesDownloaded === 0
      && delta.seedingTimeMs === 0
      && delta.peersHelped === 0
      && delta.uptimeMs === 0
    ) {
      return
    }

    const result = await reportStats(config, peerId, delta)
    if (result.success) {
      markReported()
      log.debug('Статистика отправлена', {
        up: delta.bytesUploaded,
        down: delta.bytesDownloaded,
        seedMs: delta.seedingTimeMs,
        peers: delta.peersHelped,
      })
    } else {
      log.warn('Не удалось отправить статистику', { error: result.error })
    }
  }

  /**
   * Shutdown — отправить финальный отчёт и уведомить трекер
   */
  async shutdown(): Promise<void> {
    // Останавливаем таймеры
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    if (this.statsTimer) {
      clearInterval(this.statsTimer)
      this.statsTimer = null
    }

    const config = await loadTrackerConfig()
    if (!config) {
      this.distributions.clear()
      return
    }

    // Финальный отчёт статистики
    const finalStatsPromise = this.sendStatsReport().catch(() => {
      /* игнорируем ошибки при shutdown */
    })

    // Помечаем все раздачи как OFFLINE
    const offlinePromises = this.distributions.size > 0
      ? Array.from(this.distributions.values()).map((dist) =>
        updateDistribution(config, dist.id, { status: 'OFFLINE' }).catch(() => {
          /* игнорируем ошибки при shutdown */
        })
      )
      : []

    if (offlinePromises.length > 0) {
      log.info('Останавливаем раздачи', { count: this.distributions.size })
    }

    // Ждём с таймаутом 5 секунд чтобы не задерживать выход
    await Promise.race([
      Promise.allSettled([finalStatsPromise, ...offlinePromises]),
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ])

    this.distributions.clear()
    log.info('Раздачи остановлены')
  }

  /** Получить список активных раздач */
  getDistributions(): TrackerDistribution[] {
    return Array.from(this.distributions.values())
  }

  /** Количество активных раздач */
  getCount(): number {
    return this.distributions.size
  }
}

/** Получить singleton instance */
export function getDistributionService(): DistributionService {
  return DistributionService.getInstance()
}
