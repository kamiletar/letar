/**
 * Subscription Scheduler — Автоматическое обновление подписок
 *
 * Периодически проверяет подписки на обновления через IPNS.
 * Отправляет уведомления о новом контенте и запускает автопининг.
 */

import { app, BrowserWindow, Notification } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { createModuleLogger } from '../utils/logger'

import type { SubscriptionRefreshResult } from '../../shared/types/ipfs'
import { getPinManager } from './ipfs'
import { getAllSubscriptions, refreshAllSubscriptions } from './subscription-store'

const log = createModuleLogger('Scheduler')

const SCHEDULER_CONFIG_FILE = 'subscription-scheduler.json'

/**
 * Конфигурация планировщика
 */
export interface SchedulerConfig {
  /** Включено ли автообновление */
  enabled: boolean
  /** Интервал проверки в минутах */
  intervalMinutes: number
  /** Показывать уведомления о новом контенте */
  showNotifications: boolean
  /** Автоматически пинить новый контент */
  autoPinEnabled: boolean
}

const DEFAULT_CONFIG: SchedulerConfig = {
  enabled: false,
  intervalMinutes: 60, // Каждый час
  showNotifications: true,
  autoPinEnabled: true,
}

/**
 * Получить путь к файлу конфигурации
 */
function getConfigPath(): string {
  const userDataPath = app.getPath('userData')
  return path.join(userDataPath, SCHEDULER_CONFIG_FILE)
}

/**
 * Загрузить конфигурацию
 */
export function loadSchedulerConfig(): SchedulerConfig {
  try {
    const filePath = getConfigPath()
    if (!fs.existsSync(filePath)) {
      return { ...DEFAULT_CONFIG }
    }
    const data = fs.readFileSync(filePath, 'utf-8')
    return { ...DEFAULT_CONFIG, ...JSON.parse(data) }
  } catch (error) {
    log.error('Failed to load scheduler config', { error: String(error) })
    return { ...DEFAULT_CONFIG }
  }
}

/**
 * Сохранить конфигурацию
 */
export function saveSchedulerConfig(config: SchedulerConfig): void {
  try {
    const filePath = getConfigPath()
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8')
  } catch (error) {
    log.error('Failed to save scheduler config', { error: String(error) })
    throw error
  }
}

/**
 * Обновить конфигурацию
 */
export function updateSchedulerConfig(updates: Partial<SchedulerConfig>): SchedulerConfig {
  const config = loadSchedulerConfig()
  const updated = { ...config, ...updates }
  saveSchedulerConfig(updated)
  return updated
}

/**
 * Subscription Scheduler Singleton
 */
class SubscriptionScheduler {
  private static instance: SubscriptionScheduler | null = null
  private intervalId: ReturnType<typeof setInterval> | null = null
  private isRunning = false
  private lastCheckAt: string | null = null

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- Singleton pattern
  private constructor() {}

  static getInstance(): SubscriptionScheduler {
    if (!SubscriptionScheduler.instance) {
      SubscriptionScheduler.instance = new SubscriptionScheduler()
    }
    return SubscriptionScheduler.instance
  }

  /**
   * Запустить планировщик
   */
  start(): void {
    if (this.isRunning) {
      log.info('Scheduler already running')
      return
    }

    const config = loadSchedulerConfig()
    if (!config.enabled) {
      log.info('Scheduler disabled in config')
      return
    }

    const intervalMs = config.intervalMinutes * 60 * 1000

    // Запускаем первую проверку через 1 минуту после старта
    setTimeout(() => {
      void this.checkSubscriptions()
    }, 60 * 1000)

    // Устанавливаем интервал
    this.intervalId = setInterval(() => {
      void this.checkSubscriptions()
    }, intervalMs)

    this.isRunning = true
    log.info('Scheduler started', { intervalMinutes: config.intervalMinutes })
  }

  /**
   * Остановить планировщик
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.isRunning = false
    log.info('Scheduler stopped')
  }

  /**
   * Перезапустить с новыми настройками
   */
  restart(): void {
    this.stop()
    this.start()
  }

  /**
   * Проверить все подписки
   */
  async checkSubscriptions(): Promise<SubscriptionRefreshResult[]> {
    const subscriptions = getAllSubscriptions()
    if (subscriptions.length === 0) {
      log.info('No subscriptions to check')
      return []
    }

    log.info('Checking subscriptions', { count: subscriptions.length })
    this.lastCheckAt = new Date().toISOString()

    try {
      const results = await refreshAllSubscriptions()

      // Уведомляем renderer
      this.notifyRenderer('scheduler:checked', results)

      // Обрабатываем результаты
      await this.processResults(results)

      return results
    } catch (error) {
      log.error('Subscription check failed', { error: String(error) })
      return []
    }
  }

  /**
   * Обработать результаты проверки
   */
  private async processResults(results: SubscriptionRefreshResult[]): Promise<void> {
    const config = loadSchedulerConfig()
    const updatedResults = results.filter((r) => r.hasUpdates)

    if (updatedResults.length === 0) {
      log.info('No updates found')
      return
    }

    log.info('Updates found', { count: updatedResults.length })

    // Показываем уведомление
    if (config.showNotifications) {
      this.showUpdateNotification(updatedResults)
    }

    // Автопининг
    if (config.autoPinEnabled) {
      await this.autoPinContent(updatedResults)
    }
  }

  /**
   * Показать уведомление об обновлениях
   */
  private showUpdateNotification(results: SubscriptionRefreshResult[]): void {
    const names = results
      .map((r) => r.subscription.displayName)
      .slice(0, 3)
      .join(', ')

    const suffix = results.length > 3 ? ` и ещё ${results.length - 3}` : ''

    const notification = new Notification({
      title: 'Новый контент в подписках',
      body: `Обновились: ${names}${suffix}`,
      icon: path.join(app.isPackaged ? process.resourcesPath : app.getAppPath(), 'resources', 'icon.png'),
    })

    notification.on('click', () => {
      // Открываем окно и переходим на страницу подписок
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        windows[0].show()
        windows[0].webContents.send('navigate', '/settings/sharing')
      }
    })

    notification.show()
  }

  /**
   * Автоматически закрепить новый контент
   */
  private async autoPinContent(results: SubscriptionRefreshResult[]): Promise<void> {
    const pinManager = getPinManager()

    for (const result of results) {
      if (!result.subscription.autoPin || !result.library) {
        continue
      }

      const limit = result.subscription.autoPinLimit || Infinity

      // Пиним эпизоды до лимита
      let pinnedSize = 0
      for (const anime of result.library.animes) {
        for (const episode of anime.episodes) {
          if (pinnedSize + episode.size > limit) {
            log.info('Auto-pin limit reached', { subscription: result.subscription.displayName })
            break
          }

          try {
            await pinManager.pin(episode.cid, `${result.subscription.displayName} - ${anime.name} E${episode.number}`)
            pinnedSize += episode.size
          } catch (error) {
            log.warn('Pin error', { cid: episode.cid, error: String(error) })
          }
        }
      }

      if (pinnedSize > 0) {
        log.info('Content pinned', {
          subscription: result.subscription.displayName,
          sizeMB: (pinnedSize / 1024 / 1024).toFixed(2),
        })
      }
    }
  }

  /**
   * Отправить событие в renderer
   */
  private notifyRenderer(channel: string, data: unknown): void {
    const windows = BrowserWindow.getAllWindows()
    for (const window of windows) {
      window.webContents.send(channel, data)
    }
  }

  /**
   * Получить статус
   */
  getStatus(): { isRunning: boolean; lastCheckAt: string | null; config: SchedulerConfig } {
    return {
      isRunning: this.isRunning,
      lastCheckAt: this.lastCheckAt,
      config: loadSchedulerConfig(),
    }
  }
}

/**
 * Получить экземпляр планировщика
 */
export function getSubscriptionScheduler(): SubscriptionScheduler {
  return SubscriptionScheduler.getInstance()
}
