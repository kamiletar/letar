/**
 * Tracker Registry
 *
 * Управление реестром известных трекеров.
 * Поддерживает локальный реестр и опционально — публичный.
 */

import type { PrismaClient } from '@prisma/client'

import type { TrackerInfo, TrustLevel } from '../../../../shared/types/federation'
import { createModuleLogger } from '../../../utils/logger'
import { discoverTracker } from './webfinger'

const log = createModuleLogger('TrackerRegistry')

/**
 * URL публичного реестра трекеров (опционально)
 */
const PUBLIC_REGISTRY_URL = 'https://animatrona.network/trackers.json'

/**
 * Кэш публичного реестра (TTL 1 час)
 */
interface RegistryCache {
  data: PublicTrackerInfo[]
  fetchedAt: number
}

let registryCache: RegistryCache | null = null
const CACHE_TTL = 60 * 60 * 1000 // 1 час

/**
 * Информация о трекере в публичном реестре
 */
export interface PublicTrackerInfo {
  url: string
  name: string
  description?: string
  theme: string
  language: string
  verified: boolean
}

/**
 * Tracker Registry — управление реестром трекеров
 */
export class TrackerRegistry {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  /**
   * Получить список всех трекеров из БД
   */
  async getAll(): Promise<TrackerInfo[]> {
    const trackers = await this.prisma.tracker.findMany({
      orderBy: [{ trustLevel: 'desc' }, { name: 'asc' }],
    })

    return trackers.map((t) => this.mapTrackerToInfo(t))
  }

  /**
   * Получить трекер по ID
   */
  async getById(trackerId: string): Promise<TrackerInfo | null> {
    const tracker = await this.prisma.tracker.findUnique({
      where: { id: trackerId },
    })

    return tracker ? this.mapTrackerToInfo(tracker) : null
  }

  /**
   * Получить трекер по URL
   */
  async getByUrl(url: string): Promise<TrackerInfo | null> {
    const normalizedUrl = this.normalizeUrl(url)
    const tracker = await this.prisma.tracker.findUnique({
      where: { url: normalizedUrl },
    })

    return tracker ? this.mapTrackerToInfo(tracker) : null
  }

  /**
   * Добавить трекер по URL
   *
   * 1. Обнаруживает трекер через WebFinger
   * 2. Сохраняет в БД
   */
  async add(
    url: string,
    initialTrustLevel?: TrustLevel,
  ): Promise<{
    success: boolean
    tracker?: TrackerInfo
    error?: string
  }> {
    const normalizedUrl = this.normalizeUrl(url)

    // Проверяем дубликат
    const existing = await this.prisma.tracker.findUnique({
      where: { url: normalizedUrl },
    })

    if (existing) {
      return {
        success: false,
        error: 'Трекер уже добавлен',
      }
    }

    // Обнаруживаем трекер
    const discovered = await discoverTracker(normalizedUrl)
    if (!discovered.success || !discovered.actor) {
      return {
        success: false,
        error: discovered.error ?? 'Не удалось обнаружить трекер',
      }
    }

    const actor = discovered.actor

    // Сохраняем в БД
    const tracker = await this.prisma.tracker.create({
      data: {
        url: normalizedUrl,
        name: actor.name,
        description: actor.summary ?? null,
        theme: actor['animatrona:metadata']?.theme ?? 'anime',
        language: actor['animatrona:metadata']?.language ?? 'ru',
        publicKeyPem: actor.publicKey?.publicKeyPem ?? null,
        trustLevel: this.trustLevelToDb(initialTrustLevel ?? 1),
      },
    })

    return {
      success: true,
      tracker: this.mapTrackerToInfo(tracker),
    }
  }

  /**
   * Удалить трекер
   */
  async remove(trackerId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.prisma.tracker.delete({
        where: { id: trackerId },
      })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Обновить информацию о трекере (refresh)
   */
  async refresh(trackerId: string): Promise<{
    success: boolean
    tracker?: TrackerInfo
    error?: string
  }> {
    const tracker = await this.prisma.tracker.findUnique({
      where: { id: trackerId },
    })

    if (!tracker) {
      return {
        success: false,
        error: 'Трекер не найден',
      }
    }

    // Обнаруживаем актуальную информацию
    const discovered = await discoverTracker(tracker.url)
    if (!discovered.success || !discovered.actor) {
      // Обновляем lastCheckedAt и увеличиваем failedSyncs
      await this.prisma.tracker.update({
        where: { id: trackerId },
        data: {
          lastCheckedAt: new Date(),
          failedSyncs: { increment: 1 },
        },
      })

      return {
        success: false,
        error: discovered.error ?? 'Трекер недоступен',
      }
    }

    const actor = discovered.actor

    // Обновляем информацию
    const updated = await this.prisma.tracker.update({
      where: { id: trackerId },
      data: {
        name: actor.name,
        description: actor.summary ?? null,
        theme: actor['animatrona:metadata']?.theme ?? 'anime',
        language: actor['animatrona:metadata']?.language ?? 'ru',
        publicKeyPem: actor.publicKey?.publicKeyPem ?? null,
        lastCheckedAt: new Date(),
        successfulSyncs: { increment: 1 },
      },
    })

    return {
      success: true,
      tracker: this.mapTrackerToInfo(updated),
    }
  }

  /**
   * Получить трекеры из публичного реестра
   */
  async getPublicRegistry(): Promise<PublicTrackerInfo[]> {
    // Проверяем кэш
    if (registryCache && Date.now() - registryCache.fetchedAt < CACHE_TTL) {
      return registryCache.data
    }

    try {
      const response = await fetch(PUBLIC_REGISTRY_URL, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!response.ok) {
        await response.body?.cancel().catch(() => {
          /* игнорируем */
        })
        log.warn('Публичный реестр недоступен', { status: response.status })
        return registryCache?.data ?? []
      }

      const data = (await response.json()) as { trackers: PublicTrackerInfo[] }
      registryCache = {
        data: data.trackers ?? [],
        fetchedAt: Date.now(),
      }

      return registryCache.data
    } catch (error) {
      log.warn('Ошибка получения публичного реестра', { error })
      return registryCache?.data ?? []
    }
  }

  /**
   * Поиск трекеров в публичном реестре
   */
  async searchPublicRegistry(query: string): Promise<PublicTrackerInfo[]> {
    const registry = await this.getPublicRegistry()
    const lowerQuery = query.toLowerCase()

    return registry.filter(
      (t) =>
        t.name.toLowerCase().includes(lowerQuery)
        || t.url.toLowerCase().includes(lowerQuery)
        || t.description?.toLowerCase().includes(lowerQuery),
    )
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url)
      return parsed.origin
    } catch {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return this.normalizeUrl(`https://${url}`)
      }
      throw new Error(`Невалидный URL: ${url}`)
    }
  }

  private mapTrackerToInfo(tracker: {
    id: string
    url: string
    name: string
    description: string | null
    theme: string
    language: string
    trustLevel: string
    uptimePercent: number
    avgResponseTimeMs: number
    contentQuality: number
    successfulSyncs: number
    failedSyncs: number
    contentSynced: number
    lastSyncAt: Date | null
    lastCheckedAt: Date | null
    createdAt: Date
  }): TrackerInfo {
    return {
      id: tracker.id,
      url: tracker.url,
      name: tracker.name,
      description: tracker.description ?? undefined,
      theme: tracker.theme,
      language: tracker.language,
      trustLevel: this.dbToTrustLevel(tracker.trustLevel),
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
    }
  }

  private trustLevelToDb(level: TrustLevel): string {
    const map: Record<number, string> = {
      0: 'BLOCKED',
      1: 'UNTRUSTED',
      2: 'KNOWN',
      3: 'TRUSTED',
      4: 'VERIFIED',
    }
    return map[level] ?? 'UNTRUSTED'
  }

  private dbToTrustLevel(level: string): TrustLevel {
    const map: Record<string, TrustLevel> = {
      BLOCKED: 0,
      UNTRUSTED: 1,
      KNOWN: 2,
      TRUSTED: 3,
      VERIFIED: 4,
    }
    return map[level] ?? 1
  }
}
