/**
 * TrackerSyncService — Фоновая двусторонняя синхронизация с трекером
 *
 * - Периодический sync каждые 5 минут (библиотека + прогресс + профиль)
 * - Offline queue: при ошибке сети → SyncQueueItem, при reconnect → flush
 * - Pull: применение serverItems из ответа sync к локальной БД
 * - Polling watch-progress каждые 30 секунд
 */

import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import type { WatchStatus } from '../../renderer/src/generated/prisma'
import type { TrackerConfig, TrackerServerItem, TrackerWatchProgressItem } from '../../shared/types/tracker'
import { prisma } from '../utils/db'
import { broadcastToWindows } from '../utils/ipc-handler-factory'
import { createModuleLogger } from '../utils/logger'
import { getPinManager } from './ipfs/pin-manager'
import { fetchProfile, fetchWatchProgressSince, pushWatchProgress, syncLibraryToTracker } from './tracker-client'

const log = createModuleLogger('TrackerSync')

/** Интервал полного sync (мс) */
const FULL_SYNC_INTERVAL = 5 * 60 * 1000 // 5 минут

/** Интервал polling прогресса (мс) */
const PROGRESS_POLL_INTERVAL = 30 * 1000 // 30 секунд

/** Максимум попыток для элементов очереди */
const MAX_RETRIES = 5

/** Debounce для немедленного push (мс) */
const PUSH_DEBOUNCE = 2000

/** Путь к файлу с lastSyncedAt */
function getSyncStatePath(): string {
  return path.join(app.getPath('userData'), 'tracker-sync-state.json')
}

/** Загрузить состояние синхронизации */
function loadSyncState(): { lastSyncedAt?: string; lastProgressPollAt?: string } {
  try {
    const filePath = getSyncStatePath()
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }
  } catch {
    // Ошибки чтения не критичны
  }
  return {}
}

/** Сохранить состояние синхронизации */
function saveSyncState(state: { lastSyncedAt?: string; lastProgressPollAt?: string }): void {
  try {
    fs.writeFileSync(getSyncStatePath(), JSON.stringify(state, null, 2))
  } catch {
    // Ошибки записи не критичны
  }
}

/** Загрузить конфигурацию tracker */
function loadTrackerConfig(): TrackerConfig & { enabled: boolean } {
  try {
    const configPath = path.join(app.getPath('userData'), 'tracker-config.json')
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      return { baseUrl: 'https://animatrona-tracker.letar.best', apiKey: '', enabled: false, ...data }
    }
  } catch {
    // Ошибки чтения не критичны
  }
  return { baseUrl: 'https://animatrona-tracker.letar.best', apiKey: '', enabled: false }
}

/**
 * Singleton сервис фоновой синхронизации с трекером
 */
class TrackerSyncService {
  private static instance: TrackerSyncService | null = null

  private fullSyncTimer: ReturnType<typeof setInterval> | null = null
  private progressPollTimer: ReturnType<typeof setInterval> | null = null
  private pushDebounceTimer: ReturnType<typeof setTimeout> | null = null
  private running = false
  private syncInProgress = false

  /** Кэш локальный animeId → trackerAnimeId (для быстрого lookup при push) */
  private trackerAnimeIdCache = new Map<string, string | null>()

  static getInstance(): TrackerSyncService {
    if (!TrackerSyncService.instance) {
      TrackerSyncService.instance = new TrackerSyncService()
    }
    return TrackerSyncService.instance
  }

  /**
   * Запуск фоновой синхронизации
   */
  initialize(): void {
    if (this.running) {
      return
    }
    // Ставим флаг сразу для защиты от double-call
    this.running = true

    const config = loadTrackerConfig()
    if (!config.enabled || !config.apiKey) {
      log.info('Tracker не настроен, фоновая синхронизация не запускается')
      this.running = false
      return
    }

    log.info('Запуск фоновой синхронизации с трекером')

    // Первый sync через 10 секунд после старта (дать время на инициализацию)
    setTimeout(() => {
      if (this.running) {
        this.performFullSync().catch((e) => log.error('Ошибка первого sync', { error: String(e) }))
      }
    }, 10_000)

    // Периодический полный sync
    this.fullSyncTimer = setInterval(() => {
      this.performFullSync().catch((e) => log.error('Ошибка периодического sync', { error: String(e) }))
    }, FULL_SYNC_INTERVAL)

    // Polling прогресса
    this.progressPollTimer = setInterval(() => {
      this.pollWatchProgress().catch((e) => log.error('Ошибка polling прогресса', { error: String(e) }))
    }, PROGRESS_POLL_INTERVAL)
  }

  /**
   * Остановка фоновой синхронизации
   */
  shutdown(): void {
    this.running = false

    if (this.fullSyncTimer) {
      clearInterval(this.fullSyncTimer)
      this.fullSyncTimer = null
    }
    if (this.progressPollTimer) {
      clearInterval(this.progressPollTimer)
      this.progressPollTimer = null
    }
    if (this.pushDebounceTimer) {
      clearTimeout(this.pushDebounceTimer)
      this.pushDebounceTimer = null
    }

    log.info('Фоновая синхронизация остановлена')
  }

  /**
   * Немедленный push прогресса (debounced).
   *
   * Принимает либо `trackerAnimeId` (когда известен — из discover watch),
   * либо локальный `animeId` (из library player — тогда делаем lookup в Anime.trackerAnimeId).
   * Если `trackerAnimeId === null` (аниме не опубликовано на трекер) — push пропускается silently.
   */
  pushWatchProgressImmediate(params: {
    animeId?: string
    trackerAnimeId?: string
    episodeNumber: number
    currentTime: number
    duration: number
    completed?: boolean
  }): void {
    // Асинхронный lookup trackerAnimeId если нужно, затем debounced push
    void this.resolveAndPushWatchProgress(params).catch((err) => {
      log.warn('pushWatchProgressImmediate failed', { error: String(err) })
    })
  }

  /**
   * Резолвит trackerAnimeId (если передан только локальный animeId),
   * затем запускает debounced push.
   */
  private async resolveAndPushWatchProgress(params: {
    animeId?: string
    trackerAnimeId?: string
    episodeNumber: number
    currentTime: number
    duration: number
    completed?: boolean
  }): Promise<void> {
    let trackerAnimeId = params.trackerAnimeId

    // Lookup из локальной БД если передан только animeId
    if (!trackerAnimeId && params.animeId) {
      const cached = this.trackerAnimeIdCache.get(params.animeId)
      if (cached !== undefined) {
        trackerAnimeId = cached ?? undefined
      } else {
        try {
          const anime = await prisma.anime.findUnique({
            where: { id: params.animeId },
            select: { trackerAnimeId: true },
          })
          trackerAnimeId = anime?.trackerAnimeId ?? undefined
          this.trackerAnimeIdCache.set(params.animeId, trackerAnimeId ?? null)
        } catch (err) {
          log.warn('trackerAnimeId lookup failed', { animeId: params.animeId, error: String(err) })
          return
        }
      }
    }

    // Если аниме не опубликовано на трекер — push пропускается
    if (!trackerAnimeId) {
      return
    }

    if (this.pushDebounceTimer) {
      clearTimeout(this.pushDebounceTimer)
    }

    const normalizedPayload = {
      animeId: trackerAnimeId,
      episodeNumber: params.episodeNumber,
      currentTime: params.currentTime,
      duration: params.duration,
      completed: params.completed,
      updatedAt: new Date().toISOString(),
    }

    this.pushDebounceTimer = setTimeout(() => {
      this.pushDebounceTimer = null
      const config = loadTrackerConfig()
      if (!config.apiKey) {
        return
      }

      pushWatchProgress(config, normalizedPayload)
        .then((result) => {
          if (!result.success) {
            this.enqueueIfNeeded('watchProgress', normalizedPayload)
          }
        })
        .catch(() => {
          this.enqueueIfNeeded('watchProgress', normalizedPayload)
        })
    }, PUSH_DEBOUNCE)
  }

  /**
   * Полная синхронизация: push локальной библиотеки + pull серверных изменений
   */
  private async performFullSync(): Promise<void> {
    if (this.syncInProgress) {
      log.info('Sync уже выполняется, пропускаем')
      return
    }
    this.syncInProgress = true

    try {
      await this.doFullSync()
    } finally {
      this.syncInProgress = false
    }
  }

  private async doFullSync(): Promise<void> {
    const config = loadTrackerConfig()
    if (!config.apiKey) {
      return
    }

    const syncState = loadSyncState()
    log.info('Полная синхронизация', { syncedSince: syncState.lastSyncedAt })

    // 1. Flush offline queue
    await this.flushQueue(config)

    // 2. Собрать локальную библиотеку
    const animes = await prisma.anime.findMany({
      where: { OR: [{ directoryCid: { not: null } }, { manifestCid: { not: null } }] },
      select: {
        manifestCid: true,
        directoryCid: true,
        shikimoriId: true,
        watchStatus: true,
        userRating: true,
        pinnedLocally: true,
        updatedAt: true,
        watchProgress: {
          select: {
            episode: { select: { number: true } },
            currentTime: true,
            completed: true,
            lastWatchedAt: true,
          },
        },
      },
    })

    // TODO: удалить manifestCid из mapping после миграции всех клиентов на directoryCid
    const items = animes
      .filter((a) => a.directoryCid || a.manifestCid)
      .map((a) => ({
        directoryCid: a.directoryCid ?? '',
        manifestCid: a.manifestCid ?? undefined,
        shikimoriId: a.shikimoriId ?? undefined,
        watchStatus: a.watchStatus,
        userRating: a.userRating,
        pinnedLocally: a.pinnedLocally,
        updatedAt: a.updatedAt.toISOString(),
        watchProgress: a.watchProgress.map((wp) => ({
          episodeNumber: wp.episode.number,
          currentTime: wp.currentTime,
          completed: wp.completed,
          updatedAt: wp.lastWatchedAt.toISOString(),
        })),
      }))

    // 3. Bidirectional sync
    const result = await syncLibraryToTracker(config, items, syncState.lastSyncedAt)

    if (result.success) {
      log.info('Sync успешен', {
        synced: result.synced,
        skipped: result.skipped,
        serverItems: result.serverItems?.length ?? 0,
      })

      // 4. Применить серверные изменения к локальной БД
      if (result.serverItems?.length) {
        await this.applyServerItems(result.serverItems)
      }

      // 5. Pull профиль
      await this.pullProfile(config)

      // 6. Сохранить время последней синхронизации (re-read для атомарности)
      const freshState = loadSyncState()
      freshState.lastSyncedAt = new Date().toISOString()
      saveSyncState(freshState)

      // Уведомить renderer о завершении sync
      broadcastToWindows('tracker:syncCompleted', {
        synced: result.synced,
        serverItems: result.serverItems?.length ?? 0,
      })
    } else {
      log.warn('Sync не удался', { error: result.error })
    }
  }

  /**
   * Применить серверные элементы к локальной БД
   */
  private async applyServerItems(serverItems: TrackerServerItem[]): Promise<void> {
    for (const item of serverItems) {
      try {
        // Каскадный поиск: directoryCid → manifestCid → shikimoriId (fallback при смене CID)
        let localAnime = item.directoryCid
          ? await prisma.anime.findFirst({
            where: { directoryCid: item.directoryCid },
            select: {
              id: true,
              updatedAt: true,
              shikimoriId: true,
              name: true,
              posterCid: true,
              directoryCid: true,
              pinnedLocally: true,
            },
          })
          : null
        // TODO: удалить fallback по manifestCid после миграции всех клиентов на directoryCid
        if (!localAnime) {
          localAnime = await prisma.anime.findFirst({
            where: { manifestCid: item.manifestCid },
            select: {
              id: true,
              updatedAt: true,
              shikimoriId: true,
              name: true,
              posterCid: true,
              directoryCid: true,
              pinnedLocally: true,
            },
          })
        }
        // Fallback по shikimoriId — нужен когда directoryCid обновился на трекере
        if (!localAnime && item.shikimoriId) {
          localAnime = await prisma.anime.findFirst({
            where: { shikimoriId: item.shikimoriId },
            select: {
              id: true,
              updatedAt: true,
              shikimoriId: true,
              name: true,
              posterCid: true,
              directoryCid: true,
              pinnedLocally: true,
            },
          })
        }

        if (!localAnime) {
          // Аниме нет локально — пропускаем (может быть из Cloud Library)
          continue
        }

        // Проверяем смену directoryCid — раздача обновилась на трекере
        const oldCid = localAnime.directoryCid
        const newCid = item.directoryCid
        if (newCid && oldCid && newCid !== oldCid) {
          log.info('Обнаружена смена directoryCid', {
            animeId: localAnime.id,
            name: localAnime.name,
            oldCid,
            newCid,
          })

          // Обновляем directoryCid в локальной БД
          await prisma.anime.update({
            where: { id: localAnime.id },
            data: { directoryCid: newCid },
          })

          // Перепиннинг: pin новый CID, unpin старый (если контент был запинен локально)
          if (localAnime.pinnedLocally) {
            try {
              const pinManager = getPinManager()
              await pinManager.pin(newCid, localAnime.name ?? undefined)
              await pinManager.unpin(oldCid)
              log.info('Перепиннинг выполнен', { oldCid, newCid })
            } catch (e) {
              log.error('Ошибка перепиннинга', { oldCid, newCid, error: String(e) })
            }
          }

          // Уведомляем renderer об обновлении контента
          broadcastToWindows('tracker:contentUpdated', {
            animeId: localAnime.id,
            animeName: localAnime.name,
            oldCid,
            newCid,
            repinned: localAnime.pinnedLocally,
          })
        }

        // Обновить watchStatus/userRating если серверная версия новее
        const serverUpdatedAt = new Date(item.updatedAt)
        if (serverUpdatedAt > localAnime.updatedAt) {
          await prisma.anime.update({
            where: { id: localAnime.id },
            data: {
              watchStatus: item.watchStatus as WatchStatus,
              userRating: item.userRating,
            },
          })
        }

        // Обновить DiscoverWatchProgress для каждого эпизода
        if (localAnime.shikimoriId && item.watchProgress.length) {
          for (const wp of item.watchProgress) {
            const existing = await prisma.discoverWatchProgress.findUnique({
              where: {
                shikimoriId_episodeNumber: {
                  shikimoriId: localAnime.shikimoriId!,
                  episodeNumber: wp.episodeNumber,
                },
              },
              select: { lastWatchedAt: true },
            })

            const wpUpdatedAt = new Date(wp.updatedAt)
            if (!existing || wpUpdatedAt > existing.lastWatchedAt) {
              await prisma.discoverWatchProgress.upsert({
                where: {
                  shikimoriId_episodeNumber: {
                    shikimoriId: localAnime.shikimoriId!,
                    episodeNumber: wp.episodeNumber,
                  },
                },
                create: {
                  shikimoriId: localAnime.shikimoriId!,
                  episodeNumber: wp.episodeNumber,
                  currentTime: wp.currentTime,
                  completed: wp.completed,
                  animeName: localAnime.name,
                  posterCid: localAnime.posterCid,
                  lastWatchedAt: wpUpdatedAt,
                },
                update: {
                  currentTime: wp.currentTime,
                  completed: wp.completed,
                  lastWatchedAt: wpUpdatedAt,
                },
              })
            }
          }
        }
      } catch (e) {
        log.warn('Ошибка применения серверного элемента', {
          manifestCid: item.manifestCid,
          error: String(e),
        })
      }
    }
  }

  /**
   * Polling прогресса просмотра с трекера
   */
  private async pollWatchProgress(): Promise<void> {
    const config = loadTrackerConfig()
    if (!config.apiKey) {
      return
    }

    const syncState = loadSyncState()
    const result = await fetchWatchProgressSince(config, syncState.lastProgressPollAt)

    if (result.success && result.items?.length) {
      log.info('Получено обновлений прогресса', { count: result.items.length })
      await this.applyWatchProgressUpdates(result.items)

      // Re-read для атомарности (fullSync мог обновить lastSyncedAt)
      const freshState = loadSyncState()
      saveSyncState({
        ...freshState,
        lastProgressPollAt: new Date().toISOString(),
      })
    }
  }

  /**
   * Применить обновления прогресса с трекера.
   *
   * Обновляет:
   * 1. `DiscoverWatchProgress` — для discover watch (анонимный каталог, всегда)
   * 2. `WatchProgress` — если аниме есть в локальной библиотеке и найден Episode
   *    по `episodeNumber`. Это обеспечивает кросс-устройственный просмотр library player.
   */
  private async applyWatchProgressUpdates(items: TrackerWatchProgressItem[]): Promise<void> {
    for (const item of items) {
      if (!item.shikimoriId) {
        continue
      }

      try {
        const existing = await prisma.discoverWatchProgress.findUnique({
          where: {
            shikimoriId_episodeNumber: {
              shikimoriId: item.shikimoriId,
              episodeNumber: item.episodeNumber,
            },
          },
          select: { lastWatchedAt: true },
        })

        const serverUpdatedAt = new Date(item.updatedAt)
        if (!existing || serverUpdatedAt > existing.lastWatchedAt) {
          // Получить метаданные аниме для отображения
          const anime = await prisma.anime.findFirst({
            where: { shikimoriId: item.shikimoriId },
            select: {
              id: true,
              name: true,
              posterCid: true,
              directoryCid: true,
              episodes: {
                where: { number: item.episodeNumber },
                select: { id: true },
                take: 1,
              },
            },
          })

          await prisma.discoverWatchProgress.upsert({
            where: {
              shikimoriId_episodeNumber: {
                shikimoriId: item.shikimoriId,
                episodeNumber: item.episodeNumber,
              },
            },
            create: {
              shikimoriId: item.shikimoriId,
              episodeNumber: item.episodeNumber,
              currentTime: item.currentTime,
              duration: item.duration,
              completed: item.completed,
              trackerAnimeId: item.animeId,
              animeName: anime?.name ?? '',
              posterCid: anime?.posterCid ?? null,
              directoryCid: anime?.directoryCid ?? null,
              lastWatchedAt: serverUpdatedAt,
            },
            update: {
              currentTime: item.currentTime,
              duration: item.duration,
              completed: item.completed,
              lastWatchedAt: serverUpdatedAt,
            },
          })

          // Если аниме в локальной библиотеке И есть Episode с нужным номером —
          // дублируем прогресс в WatchProgress для library player
          const localEpisodeId = anime?.episodes?.[0]?.id
          if (anime && localEpisodeId) {
            try {
              const existingWp = await prisma.watchProgress.findUnique({
                where: {
                  animeId_episodeId: {
                    animeId: anime.id,
                    episodeId: localEpisodeId,
                  },
                },
                select: { lastWatchedAt: true },
              })

              if (!existingWp || serverUpdatedAt > existingWp.lastWatchedAt) {
                await prisma.watchProgress.upsert({
                  where: {
                    animeId_episodeId: {
                      animeId: anime.id,
                      episodeId: localEpisodeId,
                    },
                  },
                  create: {
                    animeId: anime.id,
                    episodeId: localEpisodeId,
                    currentTime: item.currentTime,
                    completed: item.completed,
                    lastWatchedAt: serverUpdatedAt,
                  },
                  update: {
                    currentTime: item.currentTime,
                    completed: item.completed,
                    lastWatchedAt: serverUpdatedAt,
                  },
                })
                log.debug('WatchProgress синхронизирован из tracker', {
                  animeId: anime.id,
                  episodeId: localEpisodeId,
                  episodeNumber: item.episodeNumber,
                  currentTime: item.currentTime,
                })
              }
            } catch (wpErr) {
              log.warn('Ошибка синхронизации WatchProgress', {
                animeId: anime.id,
                episodeId: localEpisodeId,
                error: String(wpErr),
              })
            }
          }
        }
      } catch (e) {
        log.warn('Ошибка применения прогресса', {
          shikimoriId: item.shikimoriId,
          episode: item.episodeNumber,
          error: String(e),
        })
      }
    }
  }

  /**
   * Pull профиль с трекера
   */
  private async pullProfile(config: TrackerConfig): Promise<void> {
    const result = await fetchProfile(config)
    if (result.success && result.data) {
      // Сохраняем профиль в настройки или уведомляем renderer
      broadcastToWindows('tracker:profileUpdated', result.data)
    }
  }

  /**
   * Добавить в offline queue если нет сети
   */
  private async enqueueIfNeeded(type: string, payload: unknown): Promise<void> {
    try {
      await prisma.syncQueueItem.create({
        data: {
          type,
          payload: JSON.stringify(payload),
        },
      })
    } catch {
      // Если БД недоступна — просто пропускаем
    }
  }

  /**
   * Flush offline queue — отправить все накопленные элементы
   */
  private async flushQueue(config: TrackerConfig): Promise<void> {
    const items = await prisma.syncQueueItem.findMany({
      where: { retries: { lt: MAX_RETRIES } },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })

    if (!items.length) {
      return
    }

    log.info('Flush offline queue', { count: items.length })

    for (const item of items) {
      try {
        const payload = JSON.parse(item.payload)

        if (item.type === 'watchProgress') {
          // Payload уже нормализован (animeId, не trackerAnimeId)
          const result = await pushWatchProgress(config, {
            animeId: payload.animeId,
            episodeNumber: payload.episodeNumber,
            currentTime: payload.currentTime,
            duration: payload.duration,
            completed: payload.completed,
            updatedAt: payload.updatedAt ?? item.createdAt.toISOString(),
          })

          if (result.success) {
            await prisma.syncQueueItem.delete({ where: { id: item.id } })
          } else {
            await prisma.syncQueueItem.update({
              where: { id: item.id },
              data: { retries: item.retries + 1, lastError: result.error },
            })
          }
        } else {
          // Другие типы обрабатываются через полный sync
          await prisma.syncQueueItem.delete({ where: { id: item.id } })
        }
      } catch (e) {
        await prisma.syncQueueItem
          .update({
            where: { id: item.id },
            data: { retries: item.retries + 1, lastError: String(e) },
          })
          .catch(() => {
            /* игнорируем */
          })
      }
    }

    // Удалить элементы с превышенным лимитом попыток
    await prisma.syncQueueItem.deleteMany({
      where: { retries: { gte: MAX_RETRIES } },
    })
  }
}

/** Получить singleton экземпляр TrackerSyncService */
export function getTrackerSyncService(): TrackerSyncService {
  return TrackerSyncService.getInstance()
}
