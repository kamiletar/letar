/**
 * Federation IPC Handlers
 *
 * IPC интерфейс для управления федерацией трекеров.
 * Использует JSON storage для хранения данных.
 */

import * as crypto from 'crypto'

import type {
  ActivityPubActor,
  AddTrackerOptions,
  DiscoverResult,
  FederationSettings,
  GlobalSeederStats,
  SyncOptions,
  SyncResult,
  TrackerInfo,
  TrustLevel,
  TrustMetrics,
} from '../../shared/types/federation'
import { discoverTracker } from '../services/federation/discovery/webfinger'
import {
  addTracker,
  blockTracker,
  getAllTrackers,
  getFederationSettings,
  getTrackerById,
  getTrackerByUrl,
  getTrustedTrackers,
  removeTracker,
  saveKeys,
  setTrackerTrust,
  type StoredTracker,
  unblockTracker,
  updateFederationSettings,
  updateTracker,
  updateTrackerSyncStats,
} from '../services/federation/stores'
import { createHandler } from '../utils/ipc-handler-factory'

// ============================================================================
// Helpers
// ============================================================================

/**
 * Конвертировать StoredTracker в TrackerInfo для UI
 */
function trackerToInfo(tracker: StoredTracker): TrackerInfo {
  const metrics: TrustMetrics = {
    uptimePercent: tracker.uptimePercent ?? 0,
    avgResponseTimeMs: tracker.avgResponseTimeMs ?? 0,
    contentQuality: tracker.contentQuality ?? 0,
    successfulSyncs: tracker.successfulSyncs ?? 0,
    failedSyncs: tracker.failedSyncs ?? 0,
    lastCheckedAt: tracker.lastCheckedAt ?? null,
  }

  return {
    id: tracker.id,
    url: tracker.url,
    name: tracker.name,
    description: tracker.description,
    theme: tracker.theme,
    language: tracker.language,
    trustLevel: tracker.trustLevel,
    metrics,
    contentSynced: tracker.contentSynced ?? 0,
    lastSyncAt: tracker.lastSyncAt ?? null,
    createdAt: tracker.createdAt,
  }
}

/**
 * Создать mock ActivityPub Actor (для тестирования)
 */
function createMockActor(url: string, name: string): ActivityPubActor {
  return {
    '@context': ['https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1'],
    id: `${url}/federation/actor`,
    type: 'Service',
    name,
    inbox: `${url}/federation/inbox`,
    outbox: `${url}/federation/outbox`,
    publicKey: {
      id: `${url}/federation/actor#main-key`,
      owner: `${url}/federation/actor`,
      publicKeyPem: '',
    },
    endpoints: {
      content: `${url}/federation/content`,
      announces: `${url}/federation/announces`,
    },
    'animatrona:metadata': {
      theme: 'anime',
      language: 'ru',
      version: '0.24.0',
      stats: {
        animeCount: 0,
        episodeCount: 0,
        totalSize: 0,
      },
    },
  }
}

/**
 * Нормализовать URL к origin
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return parsed.origin
  } catch {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return normalizeUrl(`https://${url}`)
    }
    throw new Error(`Невалидный URL: ${url}`)
  }
}

// ============================================================================
// IPC Handlers Registration
// ============================================================================

/**
 * Регистрация IPC handlers для федерации
 */
export function registerFederationHandlers(): void {
  // === Settings ===
  createHandler('federation:getSettings', () => {
    const settings = getFederationSettings()
    // Убираем приватный ключ из ответа
    const { privateKeyPem: _, ...safeSettings } = settings as { privateKeyPem?: string } & FederationSettings
    return safeSettings
  })

  createHandler('federation:updateSettings', (update: Partial<Omit<FederationSettings, 'hasPrivateKey'>>) => {
    const updated = updateFederationSettings(update)
    const { privateKeyPem: _, ...safeSettings } = updated as { privateKeyPem?: string } & FederationSettings
    return safeSettings
  })

  createHandler('federation:generateKeys', () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })

    saveKeys(privateKey, publicKey)
    return { publicKeyPem: publicKey }
  })

  // === Discovery ===
  createHandler('federation:discover', async (url: string): Promise<DiscoverResult> => {
    const normalizedUrl = normalizeUrl(url)

    // Пробуем WebFinger discovery
    const result = await discoverTracker(normalizedUrl)

    if (result.success && result.actor) {
      // Проверяем, есть ли уже в store
      const existing = getTrackerByUrl(normalizedUrl)

      return {
        actor: result.actor,
        url: result.actorUrl ?? normalizedUrl,
        alreadyAdded: !!existing,
      }
    }

    // Если WebFinger не сработал, возвращаем mock для тестирования
    const existing = getTrackerByUrl(normalizedUrl)
    const actor = createMockActor(normalizedUrl, 'Unknown Tracker')

    return {
      actor,
      url: normalizedUrl,
      alreadyAdded: !!existing,
    }
  })

  // === Trackers ===
  createHandler('federation:listTrackers', () => {
    const trackers = getAllTrackers()
    return trackers.map(trackerToInfo)
  })

  createHandler('federation:addTracker', async (options: AddTrackerOptions): Promise<TrackerInfo> => {
    const normalizedUrl = normalizeUrl(options.url)

    // Проверяем дубликат
    const existing = getTrackerByUrl(normalizedUrl)
    if (existing) {
      throw new Error('Трекер уже добавлен')
    }

    // Пробуем обнаружить трекер
    let name = options.name ?? 'Unknown Tracker'
    let theme = 'anime'
    let language = 'ru'
    let publicKeyPem: string | undefined

    try {
      const discovered = await discoverTracker(normalizedUrl)
      if (discovered.success && discovered.actor) {
        name = discovered.actor.name
        theme = discovered.actor['animatrona:metadata']?.theme ?? 'anime'
        language = discovered.actor['animatrona:metadata']?.language ?? 'ru'
        publicKeyPem = discovered.actor.publicKey?.publicKeyPem
      }
    } catch {
      // Игнорируем ошибку discover — используем дефолтные значения
    }

    const tracker = addTracker({
      url: normalizedUrl,
      name,
      theme,
      language,
      publicKeyPem,
      trustLevel: options.trustLevel ?? 1,
    })

    return trackerToInfo(tracker)
  })

  createHandler('federation:removeTracker', (trackerId: string) => {
    const success = removeTracker(trackerId)
    if (!success) {
      throw new Error('Трекер не найден')
    }
  })

  createHandler('federation:refreshTracker', async (trackerId: string): Promise<TrackerInfo> => {
    const tracker = getTrackerById(trackerId)
    if (!tracker) {
      throw new Error('Трекер не найден')
    }

    // Пробуем обновить информацию
    try {
      const discovered = await discoverTracker(tracker.url)
      if (discovered.success && discovered.actor) {
        const updated = updateTracker(trackerId, {
          name: discovered.actor.name,
          description: discovered.actor.summary,
          theme: discovered.actor['animatrona:metadata']?.theme ?? tracker.theme,
          language: discovered.actor['animatrona:metadata']?.language ?? tracker.language,
          publicKeyPem: discovered.actor.publicKey?.publicKeyPem,
          lastCheckedAt: new Date().toISOString(),
          successfulSyncs: (tracker.successfulSyncs ?? 0) + 1,
        })

        if (updated) {
          return trackerToInfo(updated)
        }
      }
    } catch {
      // Обновляем только lastCheckedAt и failedSyncs
      updateTracker(trackerId, {
        lastCheckedAt: new Date().toISOString(),
        failedSyncs: (tracker.failedSyncs ?? 0) + 1,
      })

      throw new Error('Трекер недоступен')
    }

    throw new Error('Не удалось обновить трекер')
  })

  createHandler('federation:setTrust', (trackerId: string, trustLevel: TrustLevel): TrackerInfo => {
    const updated = setTrackerTrust(trackerId, trustLevel)
    if (!updated) {
      throw new Error('Трекер не найден')
    }
    return trackerToInfo(updated)
  })

  createHandler('federation:blockTracker', (trackerId: string) => {
    const updated = blockTracker(trackerId)
    if (!updated) {
      throw new Error('Трекер не найден')
    }
  })

  createHandler('federation:unblockTracker', (trackerId: string) => {
    const updated = unblockTracker(trackerId)
    if (!updated) {
      throw new Error('Трекер не найден')
    }
  })

  // === Sync ===
  createHandler('federation:sync', (trackerId: string, _options?: SyncOptions): SyncResult => {
    const tracker = getTrackerById(trackerId)
    if (!tracker) {
      throw new Error('Трекер не найден')
    }

    // TODO: Phase 2.4 — Реализовать полную синхронизацию контента
    // Пока возвращаем пустой результат
    const result: SyncResult = {
      tracker: tracker.url,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      syncedAt: new Date().toISOString(),
    }

    // Обновляем статистику
    updateTrackerSyncStats(trackerId, {
      lastSyncAt: new Date().toISOString(),
      contentSynced: tracker.contentSynced ?? 0,
    })

    updateTracker(trackerId, {
      successfulSyncs: (tracker.successfulSyncs ?? 0) + 1,
    })

    return result
  })

  createHandler('federation:syncAll', (_options?: SyncOptions): SyncResult[] => {
    const settings = getFederationSettings()
    const minTrust = settings.minTrustForAutoImport ?? 3

    const trackers = getTrustedTrackers(minTrust)
    const results: SyncResult[] = []

    for (const tracker of trackers) {
      try {
        // TODO: Phase 2.4 — Реализовать полную синхронизацию
        const result: SyncResult = {
          tracker: tracker.url,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: [],
          syncedAt: new Date().toISOString(),
        }

        updateTrackerSyncStats(tracker.id, {
          lastSyncAt: new Date().toISOString(),
        })

        updateTracker(tracker.id, {
          successfulSyncs: (tracker.successfulSyncs ?? 0) + 1,
        })

        results.push(result)
      } catch (error) {
        updateTracker(tracker.id, {
          failedSyncs: (tracker.failedSyncs ?? 0) + 1,
        })

        results.push({
          tracker: tracker.url,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: [(error as Error).message],
          syncedAt: new Date().toISOString(),
        })
      }
    }

    return results
  })

  // === Seeder Stats ===
  createHandler('federation:getGlobalSeeders', (cid: string): GlobalSeederStats => {
    // TODO: Phase 2.4 — Реализовать агрегацию сидеров
    return {
      cid,
      seederCount: 0,
      seeders: [],
      updatedAt: new Date().toISOString(),
    }
  })

  // === Trust Score ===
  createHandler('federation:getTrustScore', (trackerId: string): number => {
    const tracker = getTrackerById(trackerId)
    if (!tracker) {
      throw new Error('Трекер не найден')
    }

    // Простой расчёт trust score на основе метрик
    const successRate =
      tracker.successfulSyncs && tracker.failedSyncs
        ? tracker.successfulSyncs / (tracker.successfulSyncs + tracker.failedSyncs)
        : 0.5

    const uptime = (tracker.uptimePercent ?? 0) / 100
    const quality = tracker.contentQuality ?? 0.5

    // Взвешенная формула
    const score = (successRate * 0.4 + uptime * 0.3 + quality * 0.3) * 100

    return Math.round(score)
  })

  // Handlers registered (no logging needed)
}
