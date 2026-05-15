/**
 * Federation Service — Главный сервис федерации
 *
 * Координирует все операции федерации:
 * - Управление настройками
 * - Обнаружение и регистрация трекеров
 * - Синхронизация контента
 * - Trust scoring
 */

import * as crypto from 'crypto'

import type { PrismaClient } from '@prisma/client'

import type {
  ActivityPubActor,
  AddTrackerOptions,
  DiscoverResult,
  FederationOperationResult,
  FederationSettings,
  GlobalSeederStats,
  SyncOptions,
  SyncResult,
  TrackerInfo,
  TrustLevel,
} from '../../../shared/types/federation'
import { DEFAULT_FEDERATION_SETTINGS } from '../../../shared/types/federation'

// Singleton instance
let federationService: FederationService | null = null

/**
 * Получить singleton экземпляр FederationService
 */
export function getFederationService(): FederationService {
  if (!federationService) {
    throw new Error('FederationService не инициализирован. Вызовите initFederationService() сначала.')
  }
  return federationService
}

/**
 * Инициализировать FederationService
 */
export function initFederationService(prisma: PrismaClient): FederationService {
  if (!federationService) {
    federationService = new FederationService(prisma)
  }
  return federationService
}

/**
 * Главный класс сервиса федерации
 */
export class FederationService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  // ============================================================================
  // Settings
  // ============================================================================

  /**
   * Получить настройки федерации
   */
  async getSettings(): Promise<FederationOperationResult<FederationSettings>> {
    try {
      const settings = await this.prisma.federationSettings.findUnique({
        where: { id: 'default' },
      })

      if (!settings) {
        return { success: true, data: DEFAULT_FEDERATION_SETTINGS }
      }

      return {
        success: true,
        data: {
          enabled: settings.enabled,
          trackerName: settings.trackerName,
          trackerDescription: settings.trackerDescription ?? undefined,
          theme: settings.theme,
          language: settings.language,
          autoSync: settings.autoSync,
          syncIntervalMinutes: settings.syncIntervalMinutes,
          minTrustForAutoImport: settings.minTrustForAutoImport as TrustLevel,
          publicKeyPem: settings.publicKeyPem ?? undefined,
          hasPrivateKey: !!settings.privateKeyPem,
        },
      }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Обновить настройки федерации
   */
  async updateSettings(
    update: Partial<Omit<FederationSettings, 'hasPrivateKey'>>
  ): Promise<FederationOperationResult<FederationSettings>> {
    try {
      const settings = await this.prisma.federationSettings.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          ...update,
        },
        update,
      })

      return {
        success: true,
        data: {
          enabled: settings.enabled,
          trackerName: settings.trackerName,
          trackerDescription: settings.trackerDescription ?? undefined,
          theme: settings.theme,
          language: settings.language,
          autoSync: settings.autoSync,
          syncIntervalMinutes: settings.syncIntervalMinutes,
          minTrustForAutoImport: settings.minTrustForAutoImport as TrustLevel,
          publicKeyPem: settings.publicKeyPem ?? undefined,
          hasPrivateKey: !!settings.privateKeyPem,
        },
      }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Генерация RSA ключевой пары
   */
  async generateKeys(): Promise<FederationOperationResult<{ publicKeyPem: string }>> {
    try {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      })

      await this.prisma.federationSettings.upsert({
        where: { id: 'default' },
        create: {
          id: 'default',
          publicKeyPem: publicKey,
          privateKeyPem: privateKey,
        },
        update: {
          publicKeyPem: publicKey,
          privateKeyPem: privateKey,
        },
      })

      return { success: true, data: { publicKeyPem: publicKey } }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  // ============================================================================
  // Tracker Discovery
  // ============================================================================

  /**
   * Обнаружить трекер по URL (WebFinger + ActivityPub)
   */
  async discover(url: string): Promise<FederationOperationResult<DiscoverResult>> {
    try {
      // TODO: Phase 2.3 — Реализовать WebFinger + Actor fetch
      // Пока возвращаем заглушку
      const normalizedUrl = new URL(url).origin

      // Проверяем, есть ли уже в БД
      const existing = await this.prisma.tracker.findUnique({
        where: { url: normalizedUrl },
      })

      if (existing) {
        return {
          success: true,
          data: {
            actor: this.createMockActor(normalizedUrl, existing.name),
            url: normalizedUrl,
            alreadyAdded: true,
          },
        }
      }

      // TODO: Fetch WebFinger и Actor
      const actor = this.createMockActor(normalizedUrl, 'Unknown Tracker')

      return {
        success: true,
        data: {
          actor,
          url: normalizedUrl,
          alreadyAdded: false,
        },
      }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Получить список трекеров
   */
  async listTrackers(): Promise<FederationOperationResult<TrackerInfo[]>> {
    try {
      const trackers = await this.prisma.tracker.findMany({
        orderBy: { createdAt: 'desc' },
      })

      return {
        success: true,
        data: trackers.map((t) => ({
          id: t.id,
          url: t.url,
          name: t.name,
          description: t.description ?? undefined,
          theme: t.theme,
          language: t.language,
          trustLevel: this.dbTrustLevelToEnum(t.trustLevel),
          metrics: {
            uptimePercent: t.uptimePercent,
            avgResponseTimeMs: t.avgResponseTimeMs,
            contentQuality: t.contentQuality,
            successfulSyncs: t.successfulSyncs,
            failedSyncs: t.failedSyncs,
            lastCheckedAt: t.lastCheckedAt?.toISOString() ?? null,
          },
          contentSynced: t.contentSynced,
          lastSyncAt: t.lastSyncAt?.toISOString() ?? null,
          createdAt: t.createdAt.toISOString(),
        })),
      }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Добавить трекер
   */
  async addTracker(options: AddTrackerOptions): Promise<FederationOperationResult<TrackerInfo>> {
    try {
      const normalizedUrl = new URL(options.url).origin

      // Проверяем дубликат
      const existing = await this.prisma.tracker.findUnique({
        where: { url: normalizedUrl },
      })

      if (existing) {
        return { success: false, error: 'Трекер уже добавлен' }
      }

      // TODO: Phase 2.3 — Fetch actor для получения имени и publicKey
      const tracker = await this.prisma.tracker.create({
        data: {
          url: normalizedUrl,
          name: options.name ?? 'Unknown Tracker',
          trustLevel: options.trustLevel ?? 'UNTRUSTED',
        },
      })

      return {
        success: true,
        data: {
          id: tracker.id,
          url: tracker.url,
          name: tracker.name,
          description: tracker.description ?? undefined,
          theme: tracker.theme,
          language: tracker.language,
          trustLevel: this.dbTrustLevelToEnum(tracker.trustLevel),
          metrics: {
            uptimePercent: tracker.uptimePercent,
            avgResponseTimeMs: tracker.avgResponseTimeMs,
            contentQuality: tracker.contentQuality,
            successfulSyncs: tracker.successfulSyncs,
            failedSyncs: tracker.failedSyncs,
            lastCheckedAt: null,
          },
          contentSynced: 0,
          lastSyncAt: null,
          createdAt: tracker.createdAt.toISOString(),
        },
      }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Удалить трекер
   */
  async removeTracker(trackerId: string): Promise<FederationOperationResult<void>> {
    try {
      await this.prisma.tracker.delete({
        where: { id: trackerId },
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Установить уровень доверия
   */
  async setTrustLevel(trackerId: string, trustLevel: TrustLevel): Promise<FederationOperationResult<TrackerInfo>> {
    try {
      const trustLevelStr = this.enumToDbTrustLevel(trustLevel)

      const tracker = await this.prisma.tracker.update({
        where: { id: trackerId },
        data: { trustLevel: trustLevelStr },
      })

      return {
        success: true,
        data: {
          id: tracker.id,
          url: tracker.url,
          name: tracker.name,
          description: tracker.description ?? undefined,
          theme: tracker.theme,
          language: tracker.language,
          trustLevel: this.dbTrustLevelToEnum(tracker.trustLevel),
          metrics: {
            uptimePercent: tracker.uptimePercent,
            avgResponseTimeMs: tracker.avgResponseTimeMs,
            contentQuality: tracker.contentQuality,
            successfulSyncs: tracker.successfulSyncs,
            failedSyncs: tracker.failedSyncs,
            lastCheckedAt: tracker.lastCheckedAt?.toISOString() ?? null,
          },
          contentSynced: tracker.contentSynced,
          lastSyncAt: tracker.lastSyncAt?.toISOString() ?? null,
          createdAt: tracker.createdAt.toISOString(),
        },
      }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  // ============================================================================
  // Content Sync
  // ============================================================================

  /**
   * Синхронизировать с конкретным трекером
   */
  async sync(trackerId: string, _options?: SyncOptions): Promise<FederationOperationResult<SyncResult>> {
    try {
      const tracker = await this.prisma.tracker.findUnique({
        where: { id: trackerId },
      })

      if (!tracker) {
        return { success: false, error: 'Трекер не найден' }
      }

      // TODO: Phase 2.4 — Реализовать синхронизацию
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
      await this.prisma.tracker.update({
        where: { id: trackerId },
        data: {
          lastSyncAt: new Date(),
          successfulSyncs: { increment: 1 },
        },
      })

      return { success: true, data: result }
    } catch (error) {
      // Увеличиваем счётчик неудачных синхронизаций
      await this.prisma.tracker
        .update({
          where: { id: trackerId },
          data: { failedSyncs: { increment: 1 } },
        })
        .catch(() => {
          // Игнорируем ошибки обновления
        })

      return { success: false, error: (error as Error).message }
    }
  }

  /**
   * Синхронизировать со всеми доверенными трекерами
   */
  async syncAll(options?: SyncOptions): Promise<FederationOperationResult<SyncResult[]>> {
    try {
      const settings = await this.prisma.federationSettings.findUnique({
        where: { id: 'default' },
      })

      const minTrust = settings?.minTrustForAutoImport ?? 3

      const trackers = await this.prisma.tracker.findMany({
        where: {
          trustLevel: { in: this.getTrustLevelsAbove(minTrust) },
        },
      })

      const results: SyncResult[] = []

      for (const tracker of trackers) {
        const result = await this.sync(tracker.id, options)
        if (result.success && result.data) {
          results.push(result.data)
        }
      }

      return { success: true, data: results }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  // ============================================================================
  // Seeder Aggregation
  // ============================================================================

  /**
   * Получить глобальную статистику сидеров для CID
   */
  async getGlobalSeeders(cid: string): Promise<FederationOperationResult<GlobalSeederStats>> {
    try {
      // TODO: Phase 2.4 — Реализовать агрегацию сидеров
      return {
        success: true,
        data: {
          cid,
          seederCount: 0,
          seeders: [],
          updatedAt: new Date().toISOString(),
        },
      }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  /**
   * Создать mock ActivityPub Actor (для тестирования)
   */
  private createMockActor(url: string, name: string): ActivityPubActor {
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
   * Преобразовать TrustLevel enum в строку БД
   */
  private enumToDbTrustLevel(level: TrustLevel): string {
    const map: Record<TrustLevel, string> = {
      0: 'BLOCKED',
      1: 'UNTRUSTED',
      2: 'KNOWN',
      3: 'TRUSTED',
      4: 'VERIFIED',
    }
    return map[level] ?? 'UNTRUSTED'
  }

  /**
   * Преобразовать строку БД в TrustLevel enum
   */
  private dbTrustLevelToEnum(level: string): TrustLevel {
    const map: Record<string, TrustLevel> = {
      BLOCKED: 0,
      UNTRUSTED: 1,
      KNOWN: 2,
      TRUSTED: 3,
      VERIFIED: 4,
    }
    return map[level] ?? 1
  }

  /**
   * Получить trust levels выше указанного
   */
  private getTrustLevelsAbove(minLevel: number): string[] {
    const levels = ['BLOCKED', 'UNTRUSTED', 'KNOWN', 'TRUSTED', 'VERIFIED']
    return levels.slice(minLevel)
  }
}
