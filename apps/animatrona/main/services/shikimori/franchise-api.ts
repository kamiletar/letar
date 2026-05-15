/**
 * REST API клиент для получения графа франшизы Shikimori
 * Используется вместо ненадёжного поля `franchise` из GraphQL
 *
 * API: GET https://shikimori.one/api/animes/{id}/franchise
 * Возвращает полный граф связей франшизы (nodes + links)
 */

import { createModuleLogger } from '../../utils/logger'
import { acquireShikimoriSlot } from './throttle'
import type { ShikimoriFranchiseGraph } from './types'

const REST_API_BASE = 'https://shikimori.one/api'
const USER_AGENT = 'Animatrona/1.0 (Desktop App)'
const log = createModuleLogger('FranchiseApi')

/** TTL кэша в миллисекундах (30 минут — граф меняется редко) */
const CACHE_TTL_MS = 30 * 60 * 1000

/** In-memory кэш для графов франшиз */
const franchiseCache = new Map<number, { data: ShikimoriFranchiseGraph; expiresAt: number }>()

/**
 * Ждёт необходимый интервал между запросами (делегирует глобальному throttle)
 */
async function throttle(): Promise<void> {
  await acquireShikimoriSlot()
}

/**
 * Получить граф франшизы по ID аниме
 *
 * @param shikimoriId ID аниме на Shikimori
 * @returns Граф франшизы (nodes + links) или null если нет связей
 */
export async function getFranchiseGraph(shikimoriId: number): Promise<ShikimoriFranchiseGraph | null> {
  // Проверяем кэш
  const cached = franchiseCache.get(shikimoriId)
  if (cached && Date.now() < cached.expiresAt) {
    log.debug('Cache hit', { shikimoriId })
    return cached.data
  }

  // Throttle запросы
  await throttle()

  const url = `${REST_API_BASE}/animes/${shikimoriId}/franchise`
  log.info('Fetching franchise graph', { url })

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      // 404 означает что аниме нет или нет франшизы
      if (response.status === 404) {
        await response.body?.cancel().catch(() => {
          /* игнорируем */
        })
        log.info('No franchise found', { shikimoriId })
        return null
      }
      await response.body?.cancel().catch(() => {
        /* игнорируем */
      })
      throw new Error(`Shikimori API error: ${response.status} ${response.statusText}`)
    }

    const data = (await response.json()) as ShikimoriFranchiseGraph

    // Проверяем что есть хотя бы узлы
    if (!data.nodes || data.nodes.length === 0) {
      log.info('Empty graph', { shikimoriId })
      return null
    }

    log.info('Got franchise graph', { shikimoriId, nodes: data.nodes.length, links: data.links.length })

    // Кэшируем результат
    franchiseCache.set(shikimoriId, {
      data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    })

    // Также кэшируем для всех аниме в графе (они вернут тот же граф)
    for (const node of data.nodes) {
      if (node.id !== shikimoriId) {
        franchiseCache.set(node.id, {
          data,
          expiresAt: Date.now() + CACHE_TTL_MS,
        })
      }
    }

    return data
  } catch (error) {
    log.error('Error fetching franchise graph', { shikimoriId, error })
    throw error
  }
}

/**
 * Очистить кэш графов франшиз
 */
export function clearFranchiseCache(): void {
  franchiseCache.clear()
}

/**
 * Получить минимальный shikimoriId в графе (используется как стабильный ключ франшизы)
 */
export function getRootShikimoriId(graph: ShikimoriFranchiseGraph): number {
  return Math.min(...graph.nodes.map((n) => n.id))
}

/**
 * Получить название франшизы (берём название root аниме)
 */
export function getFranchiseName(graph: ShikimoriFranchiseGraph): string {
  const rootId = getRootShikimoriId(graph)
  const rootNode = graph.nodes.find((n) => n.id === rootId)
  return rootNode?.name || 'Unknown Franchise'
}
