/**
 * Seeder Aggregator
 *
 * Агрегация статистики сидеров по CID со всех известных трекеров.
 * Позволяет узнать, сколько пиров сидируют конкретный контент.
 */

import type { PrismaClient } from '@prisma/client'

import type { GlobalSeederStats, SeederInfo } from '../../../../shared/types/federation'
import { createModuleLogger } from '../../../utils/logger'
import { ActivityPubClient } from '../activitypub/client'

const log = createModuleLogger('SeederAggregator')

/**
 * Кэш статистики сидеров (TTL 5 минут)
 */
interface SeederCache {
  data: GlobalSeederStats
  fetchedAt: number
}

const seederCache = new Map<string, SeederCache>()
const CACHE_TTL = 5 * 60 * 1000 // 5 минут

/**
 * Seeder Aggregator
 */
export class SeederAggregator {
  private prisma: PrismaClient
  private client: ActivityPubClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
    this.client = new ActivityPubClient(prisma)
  }

  /**
   * Получить глобальную статистику сидеров для CID
   *
   * Опрашивает все доверенные трекеры и агрегирует информацию о сидерах.
   */
  async getGlobalStats(cid: string, useCache = true): Promise<GlobalSeederStats> {
    // Проверяем кэш
    if (useCache) {
      const cached = seederCache.get(cid)
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
        return cached.data
      }
    }

    const seeders: SeederInfo[] = []
    const seenPeerIds = new Set<string>()

    // Получаем трекеры с trust level >= KNOWN
    const trackers = await this.prisma.tracker.findMany({
      where: {
        trustLevel: { in: ['KNOWN', 'TRUSTED', 'VERIFIED'] },
      },
    })

    // Опрашиваем каждый трекер
    for (const tracker of trackers) {
      try {
        const announcesUrl = `${tracker.url}/federation/announces`
        const response = await this.client.fetchAnnounces(announcesUrl, cid)

        if (response?.orderedItems) {
          for (const announce of response.orderedItems) {
            const peerId = announce['animatrona:peerId']

            // Дедупликация по PeerId
            if (peerId && !seenPeerIds.has(peerId)) {
              seenPeerIds.add(peerId)
              seeders.push({
                peerId,
                trackerUrl: tracker.url,
                lastSeenAt: announce.published ?? new Date().toISOString(),
              })
            }
          }
        }
      } catch (error) {
        log.warn('Ошибка при опросе трекера', { url: tracker.url, error })
      }
    }

    const stats: GlobalSeederStats = {
      cid,
      seederCount: seeders.length,
      seeders,
      updatedAt: new Date().toISOString(),
    }

    // Сохраняем в кэш
    seederCache.set(cid, {
      data: stats,
      fetchedAt: Date.now(),
    })

    return stats
  }

  /**
   * Получить статистику для нескольких CID
   */
  async getBatchStats(cids: string[]): Promise<Map<string, GlobalSeederStats>> {
    const results = new Map<string, GlobalSeederStats>()

    // Параллельно запрашиваем все CID
    const promises = cids.map(async (cid) => {
      const stats = await this.getGlobalStats(cid)
      results.set(cid, stats)
    })

    await Promise.all(promises)
    return results
  }

  /**
   * Получить топ CID по количеству сидеров
   */
  async getTopSeededContent(limit = 10): Promise<GlobalSeederStats[]> {
    // Получаем все закэшированные статистики
    const allStats: GlobalSeederStats[] = []

    for (const [, cache] of seederCache) {
      if (Date.now() - cache.fetchedAt < CACHE_TTL) {
        allStats.push(cache.data)
      }
    }

    // Сортируем по количеству сидеров
    return allStats.sort((a, b) => b.seederCount - a.seederCount).slice(0, limit)
  }

  /**
   * Найти трекеры, сидирующие конкретный контент
   */
  async findTrackersForCid(cid: string): Promise<string[]> {
    const stats = await this.getGlobalStats(cid)
    const trackerUrls = new Set<string>()

    for (const seeder of stats.seeders) {
      trackerUrls.add(seeder.trackerUrl)
    }

    return Array.from(trackerUrls)
  }

  /**
   * Очистить кэш
   */
  clearCache(): void {
    seederCache.clear()
  }

  /**
   * Очистить кэш для конкретного CID
   */
  clearCacheForCid(cid: string): void {
    seederCache.delete(cid)
  }

  /**
   * Получить размер кэша
   */
  getCacheSize(): number {
    return seederCache.size
  }
}
