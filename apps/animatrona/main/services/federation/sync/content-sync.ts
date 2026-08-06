/**
 * Content Sync Service
 *
 * Pull-based синхронизация контента между трекерами.
 * Получает контент с удалённых трекеров и сохраняет в локальную БД.
 */

import type { PrismaClient, Tracker } from '@prisma/client'

import type { SyncOptions, SyncResult, TrustLevel, VideoSeriesObject } from '../../../../shared/types/federation'
import { createModuleLogger } from '../../../utils/logger'
import { ActivityPubClient } from '../activitypub/client'
import type { ContentResponse } from '../activitypub/types'

const log = createModuleLogger('ContentSync')

/**
 * Максимальное количество записей за одну синхронизацию
 */
const MAX_SYNC_ITEMS = 100

/**
 * Content Sync Service
 */
export class ContentSyncService {
  private prisma: PrismaClient
  private client: ActivityPubClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.client = new ActivityPubClient(prisma)
  }

  /**
   * Синхронизировать контент с конкретным трекером
   */
  async syncTracker(trackerId: string, options?: SyncOptions): Promise<SyncResult> {
    const tracker = await this.prisma.tracker.findUnique({
      where: { id: trackerId },
    })

    if (!tracker) {
      return this.errorResult('Трекер не найден')
    }

    // Проверяем trust level
    const trustLevel = this.dbToTrustLevel(tracker.trustLevel)
    if (trustLevel === 0) {
      return this.errorResult('Трекер заблокирован', tracker.url)
    }

    try {
      // Получаем content endpoint из actor
      const contentUrl = `${tracker.url}/federation/content`

      // Формируем параметры запроса
      const since = options?.since ?? tracker.lastSyncAt?.toISOString()

      // Получаем контент
      const response = await this.client.fetchContent(contentUrl, since)
      if (!response) {
        await this.updateTrackerStats(trackerId, false)
        return this.errorResult('Не удалось получить контент', tracker.url)
      }

      // Обрабатываем контент
      const result = await this.processContent(tracker, response, options)

      // Обновляем статистику трекера
      await this.updateTrackerStats(trackerId, true, result.imported)

      return result
    } catch (error) {
      await this.updateTrackerStats(trackerId, false)
      return this.errorResult((error as Error).message, tracker.url)
    }
  }

  /**
   * Синхронизировать со всеми доверенными трекерами
   */
  async syncAll(options?: SyncOptions): Promise<SyncResult[]> {
    const settings = await this.prisma.federationSettings.findUnique({
      where: { id: 'default' },
    })

    const minTrust = settings?.minTrustForAutoImport ?? 3

    // Получаем трекеры с достаточным trust level
    const trackers = await this.prisma.tracker.findMany({
      where: {
        trustLevel: { in: this.getTrustLevelsAbove(minTrust) },
      },
    })

    const results: SyncResult[] = []

    for (const tracker of trackers) {
      const result = await this.syncTracker(tracker.id, options)
      results.push(result)
    }

    return results
  }

  /**
   * Проверить, существует ли контент локально (по external IDs)
   */
  async findExistingContent(content: VideoSeriesObject): Promise<string | null> {
    const { externalIds } = content

    if (!externalIds) {
      return null
    }

    // Поиск по MAL ID
    if (externalIds.mal) {
      const existing = await this.prisma.federatedContent.findFirst({
        where: { malId: externalIds.mal },
      })
      if (existing) {
        return existing.id
      }
    }

    // Поиск по Shikimori ID
    if (externalIds.shikimori) {
      const existing = await this.prisma.federatedContent.findFirst({
        where: { shikimoriId: externalIds.shikimori },
      })
      if (existing) {
        return existing.id
      }
    }

    // Поиск по AniList ID
    if (externalIds.anilist) {
      const existing = await this.prisma.federatedContent.findFirst({
        where: { anilistId: externalIds.anilist },
      })
      if (existing) {
        return existing.id
      }
    }

    return null
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Обработать полученный контент
   */
  private async processContent(
    tracker: Tracker,
    response: ContentResponse,
    options?: SyncOptions,
  ): Promise<SyncResult> {
    const result: SyncResult = {
      tracker: tracker.url,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      syncedAt: new Date().toISOString(),
    }

    const items = response.orderedItems ?? []
    const limit = options?.limit ?? MAX_SYNC_ITEMS

    for (let i = 0; i < Math.min(items.length, limit); i++) {
      const content = items[i]

      try {
        // Проверяем, существует ли уже
        const existing = await this.prisma.federatedContent.findUnique({
          where: {
            trackerId_remoteId: {
              trackerId: tracker.id,
              remoteId: content.id,
            },
          },
        })

        if (existing) {
          if (options?.force) {
            // Обновляем
            await this.prisma.federatedContent.update({
              where: { id: existing.id },
              data: {
                contentJson: JSON.stringify(content),
                malId: content.externalIds?.mal ?? null,
                anilistId: content.externalIds?.anilist ?? null,
                shikimoriId: content.externalIds?.shikimori ?? null,
                anidbId: content.externalIds?.anidb ?? null,
              },
            })
            result.updated++
          } else {
            result.skipped++
          }
          continue
        }

        // Проверяем дедупликацию по external IDs
        const duplicateId = await this.findExistingContent(content)
        if (duplicateId && !options?.force) {
          result.skipped++
          continue
        }

        // Создаём новую запись
        await this.prisma.federatedContent.create({
          data: {
            trackerId: tracker.id,
            remoteId: content.id,
            contentJson: JSON.stringify(content),
            malId: content.externalIds?.mal ?? null,
            anilistId: content.externalIds?.anilist ?? null,
            shikimoriId: content.externalIds?.shikimori ?? null,
            anidbId: content.externalIds?.anidb ?? null,
          },
        })

        result.imported++
      } catch (error) {
        result.errors.push(`${content.id}: ${(error as Error).message}`)
      }
    }

    return result
  }

  /**
   * Обновить статистику трекера
   */
  private async updateTrackerStats(trackerId: string, success: boolean, imported = 0): Promise<void> {
    try {
      if (success) {
        await this.prisma.tracker.update({
          where: { id: trackerId },
          data: {
            lastSyncAt: new Date(),
            lastCheckedAt: new Date(),
            successfulSyncs: { increment: 1 },
            contentSynced: { increment: imported },
          },
        })
      } else {
        await this.prisma.tracker.update({
          where: { id: trackerId },
          data: {
            lastCheckedAt: new Date(),
            failedSyncs: { increment: 1 },
          },
        })
      }
    } catch (error) {
      log.error('Ошибка обновления статистики', { error })
    }
  }

  /**
   * Создать результат с ошибкой
   */
  private errorResult(error: string, tracker = 'unknown'): SyncResult {
    return {
      tracker,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [error],
      syncedAt: new Date().toISOString(),
    }
  }

  /**
   * Преобразовать строку БД в TrustLevel
   */
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

  /**
   * Получить trust levels выше указанного
   */
  private getTrustLevelsAbove(minLevel: number): string[] {
    const levels = ['BLOCKED', 'UNTRUSTED', 'KNOWN', 'TRUSTED', 'VERIFIED']
    return levels.slice(minLevel)
  }
}
