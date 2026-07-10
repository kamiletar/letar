/**
 * IPC Handlers для интеграции с animatrona-tracker
 *
 * Каналы:
 * - tracker:getConfig — Получить конфигурацию
 * - tracker:updateConfig — Обновить конфигурацию
 * - tracker:testConnection — Проверить подключение
 * - tracker:publish — Опубликовать аниме на tracker
 * - tracker:batchPublish — Пакетная публикация нескольких аниме
 * - tracker:cancelBatch — Отменить пакетную публикацию
 */

import { CID } from 'multiformats/cid'
import type {
  TrackerAnimeDetailResult,
  TrackerBatchItem,
  TrackerBatchProgress,
  TrackerBatchResult,
  TrackerCatalogResult,
  TrackerConfig,
  TrackerConnectionResult,
  TrackerDistribution,
  TrackerLibraryItem,
  TrackerPublishResult,
  TrackerSyncResult,
} from '../../shared/types/tracker'

import { repinAnimeContent, unpinAnimeContent } from '../services/content-deletion'
import { getDistributionService } from '../services/distribution-service'
import { getKuboService } from '../services/kubo'
import {
  addToLibraryViaTracker,
  fetchLibraryFromTracker,
  fetchTrackerAnimeDetail,
  fetchTrackerCatalog,
  publishToTracker,
  syncLibraryToTracker,
  testTrackerConnection,
} from '../services/tracker-client'
import { getTrackerSyncService } from '../services/tracker-sync'
import { createConfigStore } from '../utils/config-store'
import { prisma } from '../utils/db'
import { broadcastToWindows, createHandler } from '../utils/ipc-handler-factory'
import { createModuleLogger } from '../utils/logger'

const log = createModuleLogger('TrackerHandlers')

/** Флаг отмены пакетной публикации */
let batchCancelled = false

/** Config store для tracker */
const trackerConfigStore = createConfigStore<TrackerConfig>('tracker-config.json', {
  baseUrl: 'https://animatrona-tracker.letar.best',
  apiKey: '',
  enabled: false,
})

/** Загрузить конфигурацию tracker */
async function loadTrackerConfig(): Promise<TrackerConfig> {
  return trackerConfigStore.load()
}

/**
 * Форсировать DHT-анонс CID перед публикацией на трекер
 *
 * Kubo анонсирует контент в DHT автоматически, но с задержкой (reprovide interval ~22ч).
 * Явный вызов routing.provide() форсирует немедленный анонс — после этого
 * публичные гейтвеи (ipfs.io, dweb.link, cloudflare-ipfs.com) смогут найти контент.
 *
 * Запускаем fire-and-forget с таймаутом 3 сек — достаточно для старта анонса,
 * не блокируем публикацию на весь процесс provide (он может занять минуты).
 */
async function forceDhtProvide(cidStr: string): Promise<void> {
  const client = getKuboService().getClientOrNull()
  if (!client) {
    return
  }

  try {
    const cid = CID.parse(cidStr)
    // Запускаем provide и ждём 3 секунды — даём DHT время начать анонс
    await Promise.race([
      // Consume first item from async generator to trigger provide
      (async () => {
        for await (const _ of client.routing.provide(cid)) {
          break // Достаточно одного шага чтобы запустить анонс
        }
      })(),
      new Promise<void>((resolve) => setTimeout(resolve, 3000)),
    ])
    log.debug('DHT provide выполнен', { cid: cidStr.slice(0, 20) })
  } catch (error) {
    // Не критично — публикуем даже если provide не сработал
    log.warn('DHT provide не удался', { cid: cidStr.slice(0, 20), error: String(error) })
  }
}

/**
 * Регистрация IPC handlers для tracker
 */
export function registerTrackerHandlers(): void {
  // Получить конфигурацию
  createHandler('tracker:getConfig', async (): Promise<TrackerConfig> => {
    return loadTrackerConfig()
  })

  // Обновить конфигурацию
  createHandler('tracker:updateConfig', async (updates: Partial<TrackerConfig>): Promise<TrackerConfig> => {
    const updated = await trackerConfigStore.update(updates)
    log.info('Конфигурация tracker обновлена', { enabled: updated.enabled, hasApiKey: !!updated.apiKey })
    return updated
  })

  // Проверить подключение
  createHandler('tracker:testConnection', async (): Promise<TrackerConnectionResult> => {
    const config = await loadTrackerConfig()

    if (!config.apiKey) {
      return { success: false, message: 'API ключ не настроен' }
    }

    return testTrackerConnection(config)
  })

  // Опубликовать аниме на tracker по directoryCid
  createHandler('tracker:publish', async (directoryCid: string): Promise<TrackerPublishResult> => {
    const config = await loadTrackerConfig()

    if (!config.enabled) {
      return { success: false, error: 'Публикация отключена в настройках' }
    }

    if (!config.apiKey) {
      return { success: false, error: 'API ключ не настроен' }
    }

    if (!directoryCid) {
      return { success: false, error: 'Сначала постройте IPFS-директорию' }
    }

    const result = await publishToTracker(config, directoryCid)

    // Ставим trackerPublishedAt + trackerPublishedCid при успешной публикации
    if (result.success) {
      try {
        await prisma.anime.updateMany({
          where: { directoryCid },
          data: { trackerPublishedAt: new Date(), trackerPublishedCid: directoryCid },
        })
      } catch (e) {
        log.warn('Не удалось обновить trackerPublishedAt', { error: String(e) })
      }
    }

    return result
  })

  // Пакетная публикация нескольких аниме
  createHandler('tracker:batchPublish', async (items: TrackerBatchItem[]): Promise<TrackerBatchResult> => {
    const config = await loadTrackerConfig()

    if (!config.enabled) {
      throw new Error('Публикация отключена в настройках')
    }

    if (!config.apiKey) {
      throw new Error('API ключ не настроен')
    }

    log.info('Запуск пакетной публикации', { count: items.length })

    // Сбрасываем флаг отмены
    batchCancelled = false

    const results: TrackerBatchResult['results'] = []
    let successCount = 0
    let errorCount = 0
    let cancelledCount = 0

    for (let i = 0; i < items.length; i++) {
      // Проверяем флаг отмены
      if (batchCancelled) {
        cancelledCount = items.length - i
        log.info('Пакетная публикация отменена', { completed: i, cancelled: cancelledCount })
        break
      }

      const item = items[i]

      // Читаем актуальный directoryCid из БД по id
      // (UI может передавать устаревшие значения после регенерации манифестов)
      const localAnime = await prisma.anime.findFirst({
        where: { id: item.animeId },
        select: { directoryCid: true },
      })

      const actualDirectoryCid = localAnime?.directoryCid
      if (!actualDirectoryCid) {
        errorCount++
        results.push({
          directoryCid: item.directoryCid,
          animeName: item.animeName,
          result: { success: false, error: 'IPFS-директория не построена. Перегенерируйте манифесты.' },
        })
        continue
      }

      // Отправляем прогресс до начала обработки
      const progress: TrackerBatchProgress = {
        current: i,
        total: items.length,
        currentAnimeName: item.animeName,
        currentDirectoryCid: actualDirectoryCid,
      }
      broadcastToWindows('tracker:batchProgress', progress)

      // Форсируем DHT-анонс directoryCid перед публикацией на трекер.
      // Без этого публичные гейтвеи (ipfs.io, dweb.link) не могут найти контент
      // сразу после пиннинга — DHT propagation занимает время.
      // routing.provide() форсирует немедленный анонс в DHT.
      await forceDhtProvide(actualDirectoryCid)

      const result = await publishToTracker(config, actualDirectoryCid)

      // Обновляем trackerPublishedAt при успехе
      if (result.success) {
        successCount++
        try {
          await prisma.anime.update({
            where: { id: item.animeId },
            data: { trackerPublishedAt: new Date(), trackerPublishedCid: actualDirectoryCid },
          })
        } catch (e) {
          log.warn('Не удалось обновить trackerPublishedAt', { animeId: item.animeId, error: String(e) })
        }
      } else {
        errorCount++
      }

      results.push({
        directoryCid: item.directoryCid,
        animeName: item.animeName,
        result,
      })

      // Отправляем прогресс после обработки (с результатом)
      const progressAfter: TrackerBatchProgress = {
        current: i + 1,
        total: items.length,
        currentAnimeName: item.animeName,
        currentDirectoryCid: item.directoryCid,
        result,
      }
      broadcastToWindows('tracker:batchProgress', progressAfter)
    }

    log.info('Пакетная публикация завершена', { total: items.length, successCount, errorCount, cancelledCount })

    return {
      total: items.length,
      successCount,
      errorCount,
      cancelledCount,
      results,
    }
  })

  // Отменить пакетную публикацию
  createHandler('tracker:cancelBatch', () => {
    log.info('Запрос отмены пакетной публикации')
    batchCancelled = true
  })

  // Получить список активных раздач
  createHandler('tracker:getDistributions', (): TrackerDistribution[] => {
    return getDistributionService().getDistributions()
  })

  // ============================================================================
  // Cloud Library — Облачная библиотека
  // ============================================================================

  // Получить каталог аниме с трекера (публичный endpoint — не требует API ключ)
  createHandler(
    'tracker:getCatalog',
    async (params?: { page?: number; limit?: number; q?: string }): Promise<TrackerCatalogResult> => {
      const config = await loadTrackerConfig()
      return fetchTrackerCatalog(config, params)
    }
  )

  // Получить детали аниме с трекера (публичный endpoint — не требует API ключ)
  createHandler('tracker:getAnimeDetail', async (animeId: string): Promise<TrackerAnimeDetailResult> => {
    const config = await loadTrackerConfig()
    return fetchTrackerAnimeDetail(config, animeId)
  })

  // Синхронизировать библиотеку с трекером (bidirectional)
  createHandler('tracker:syncLibrary', async (): Promise<TrackerSyncResult> => {
    const config = await loadTrackerConfig()
    if (!config.apiKey) {
      return { success: false, error: 'API ключ не настроен' }
    }

    // Читаем lastSyncedAt из sync state
    const syncStatePath = path.join(app.getPath('userData'), 'tracker-sync-state.json')
    let syncedSince: string | undefined
    try {
      if (fs.existsSync(syncStatePath)) {
        const state = JSON.parse(fs.readFileSync(syncStatePath, 'utf-8'))
        syncedSince = state.lastSyncedAt
      }
    } catch {
      // Ошибки чтения не критичны
    }

    // Собираем данные локальной библиотеки с updatedAt
    const animes = await prisma.anime.findMany({
      where: { directoryCid: { not: null } },
      select: {
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

    const items = animes
      .filter((a) => a.directoryCid)
      .map((a) => ({
        directoryCid: a.directoryCid ?? '',
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

    log.info('Bidirectional синхронизация библиотеки с трекером', {
      count: items.length,
      syncedSince,
    })

    const result = await syncLibraryToTracker(config, items, syncedSince)

    // Сохранить lastSyncedAt при успехе
    if (result.success) {
      try {
        const state = fs.existsSync(syncStatePath) ? JSON.parse(fs.readFileSync(syncStatePath, 'utf-8')) : {}
        state.lastSyncedAt = new Date().toISOString()
        fs.writeFileSync(syncStatePath, JSON.stringify(state, null, 2))
      } catch {
        // Ошибки записи не критичны
      }
    }

    return result
  })

  // Отправить прогресс просмотра на трекер (fire-and-forget из renderer)
  //
  // Принимает ЛИБО trackerAnimeId (для discover watch), ЛИБО локальный animeId
  // (для library player). В случае animeId — lookup trackerAnimeId из Anime в БД.
  createHandler(
    'tracker:pushWatchProgress',
    async (params: {
      /** Локальный ID аниме (cuid) — для library player, требует lookup */
      animeId?: string
      /** ID аниме на трекере — для discover watch, уже известен */
      trackerAnimeId?: string
      episodeNumber: number
      currentTime: number
      duration: number
      completed?: boolean
    }) => {
      const config = await loadTrackerConfig()
      if (!config.apiKey) {
        return
      }

      // Используем sync service для debounced push + offline queue
      // Он сам сделает lookup trackerAnimeId если нужно
      getTrackerSyncService().pushWatchProgressImmediate(params)
    }
  )

  // Немедленный push watchStatus одного аниме на трекер
  createHandler('tracker:pushLibraryItem', (animeId: string) => {
    getTrackerSyncService().pushLibraryItemImmediate(animeId)
  })

  // Запуск фоновой синхронизации
  createHandler('tracker:startSync', () => {
    getTrackerSyncService().initialize()
  })

  // Остановка фоновой синхронизации
  createHandler('tracker:stopSync', () => {
    getTrackerSyncService().shutdown()
  })

  // Получить библиотеку с трекера (для восстановления)
  createHandler(
    'tracker:getLibrary',
    async (): Promise<{ success: boolean; data?: TrackerLibraryItem[]; error?: string }> => {
      const config = await loadTrackerConfig()
      if (!config.apiKey) {
        return { success: false, error: 'API ключ не настроен' }
      }
      return fetchLibraryFromTracker(config)
    }
  )

  // Добавить аниме из трекера в библиотеку
  createHandler('tracker:addToLibrary', async (animeId: string) => {
    const config = await loadTrackerConfig()
    if (!config.apiKey) {
      return { success: false, error: 'API ключ не настроен' }
    }
    return addToLibraryViaTracker(config, animeId)
  })

  // Открепить контент аниме (освобождение места, Cloud Library)
  createHandler('library:unpinAnime', async (animeId: string) => {
    log.info('Открепление контента аниме', { animeId })
    const result = await unpinAnimeContent(animeId)
    return { success: true, data: result }
  })

  // Пакетное изменение статуса просмотра
  createHandler('library:batchUpdateWatchStatus', async (input: { animeIds: string[]; watchStatus: string }) => {
    log.info('Пакетное обновление watchStatus', { count: input.animeIds.length, watchStatus: input.watchStatus })
    const updated = await prisma.anime.updateMany({
      where: { id: { in: input.animeIds } },
      data: { watchStatus: input.watchStatus as never },
    })
    // Push на трекер для каждого аниме (без ожидания — fire-and-forget)
    for (const animeId of input.animeIds) {
      getTrackerSyncService().pushLibraryItemImmediate(animeId)
    }
    return { success: true, count: updated.count }
  })

  // Пакетный аспин аниме (последовательно, с прогрессом)
  createHandler('library:batchUnpinAnime', async (animeIds: string[]) => {
    log.info('Пакетный аспин', { count: animeIds.length })
    let done = 0
    let failed = 0
    const total = animeIds.length

    for (const animeId of animeIds) {
      try {
        // Получаем имя для прогресса
        const anime = await prisma.anime.findUnique({ where: { id: animeId }, select: { name: true } })
        broadcastToWindows('library:batchUnpinProgress', {
          current: done + 1,
          total,
          animeName: anime?.name ?? animeId,
        })
        await unpinAnimeContent(animeId)
        done++
      } catch {
        failed++
        done++
      }
    }

    return { success: true, count: total - failed, failed }
  })

  // Закрепить контент аниме (скачать с пиров на диск)
  createHandler('library:repinAnime', async (animeId: string) => {
    log.info('Закрепление контента аниме', { animeId })
    const result = await repinAnimeContent(animeId)
    return { success: true, data: result }
  })

  // Автозапуск фоновой синхронизации при наличии настроенного трекера
  const trackerConfig = loadTrackerConfig()
  if (trackerConfig.enabled && trackerConfig.apiKey) {
    // Запускаем sync после инициализации всех IPC
    setTimeout(() => getTrackerSyncService().initialize(), 5000)
  }
}
