/**
 * Статистика Kubo — пиры, bandwidth, размер репо
 *
 * Функции для получения и обновления статистики IPFS ноды.
 */

import type { KuboRPCClient } from 'kubo-rpc-client' with { 'resolution-mode': 'import' }

import type { IpfsServiceStatus } from '../../../shared/types/ipfs'
import { createModuleLogger } from '../../utils/logger'

const log = createModuleLogger('KuboStats')

/**
 * Результат обновления количества пиров
 */
export interface PeerCountResult {
  /** Новое количество пиров */
  count: number
  /** Обновлённый кэш размера блокстора */
  cachedBlockstoreSize: number
}

/**
 * Обновить количество подключённых пиров и кэш размера репо
 */
export async function updatePeerCount(
  client: KuboRPCClient | null,
  apiUrl: string | null,
  previousCount: number,
  previousBlockstoreSize: number,
): Promise<PeerCountResult> {
  if (!client) {
    return { count: previousCount, cachedBlockstoreSize: previousBlockstoreSize }
  }

  let count = previousCount
  let cachedBlockstoreSize = previousBlockstoreSize

  try {
    const peers = await client.swarm.peers()
    count = peers.length

    if (count !== previousCount) {
      log.debug('Peer count updated', { peers: count })
    }

    // Обновляем кэш размера репо (тяжёлый запрос — раз в 30 сек)
    if (apiUrl) {
      try {
        const repoRes = await fetch(`${apiUrl}/api/v0/repo/stat`, {
          method: 'POST',
          signal: AbortSignal.timeout(5000),
        })
        if (repoRes.ok) {
          const repo = (await repoRes.json()) as { RepoSize?: number }
          cachedBlockstoreSize = Number(repo.RepoSize) || 0
        }
      } catch {
        // Игнорируем — используем предыдущий кэш
      }
    }
  } catch (error) {
    log.debug('Failed to get peer count', { error: String(error) })
  }

  return { count, cachedBlockstoreSize }
}

/**
 * Получить только bandwidth stats (лёгкий запрос, для частого polling)
 */
export async function getBandwidthOnly(apiUrl: string | null): Promise<{ bytesIn: number; bytesOut: number }> {
  if (!apiUrl) {
    return { bytesIn: 0, bytesOut: 0 }
  }

  const ac = new AbortController()
  const res = await fetch(`${apiUrl}/api/v0/stats/bw`, {
    method: 'POST',
    signal: ac.signal,
  })

  if (!res.ok || !res.body) {
    return { bytesIn: 0, bytesOut: 0 }
  }

  const reader = res.body.getReader()
  const { value } = await reader.read()
  ac.abort()
  reader.releaseLock()

  if (!value) {
    return { bytesIn: 0, bytesOut: 0 }
  }

  const firstLine = new TextDecoder()
    .decode(value)
    .split('\n')
    .find((l) => l.trim())
  if (!firstLine) {
    return { bytesIn: 0, bytesOut: 0 }
  }

  const bw = JSON.parse(firstLine)
  return {
    bytesIn: Number(bw.TotalIn) || 0,
    bytesOut: Number(bw.TotalOut) || 0,
  }
}

/**
 * Параметры для получения расширенного IPFS статуса
 */
export interface GetIpfsStatusParams {
  client: KuboRPCClient | null
  peerId: string | null
  connectedPeers: number
  apiUrl: string | null
}

/**
 * Получить расширенный статус для UI (с трафиком и размером репо)
 */
export async function getIpfsStatus(params: GetIpfsStatusParams): Promise<IpfsServiceStatus> {
  const { client, peerId, connectedPeers, apiUrl } = params

  const baseStatus: IpfsServiceStatus = {
    isRunning: client !== null,
    peerId,
    connectedPeers,
    bytesIn: 0,
    bytesOut: 0,
    blockstoreSize: 0,
    natStatus: 'unknown',
  }

  if (!client) {
    return baseStatus
  }

  // Kubo stats/bw — бесконечный NDJSON стрим, нельзя использовать .text().
  // Читаем первый чанк через stream reader и сразу закрываем.
  if (apiUrl) {
    try {
      const ac = new AbortController()
      const bwRes = await fetch(`${apiUrl}/api/v0/stats/bw`, {
        method: 'POST',
        signal: ac.signal,
      })
      if (bwRes.ok && bwRes.body) {
        const reader = bwRes.body.getReader()
        const decoder = new TextDecoder()
        const { value } = await reader.read()
        // Прерываем стрим сразу после первого чанка
        ac.abort()
        reader.releaseLock()

        if (value) {
          const text = decoder.decode(value)
          const firstLine = text.split('\n').find((l) => l.trim())
          if (firstLine) {
            const bw = JSON.parse(firstLine)
            baseStatus.bytesIn = Number(bw.TotalIn) || 0
            baseStatus.bytesOut = Number(bw.TotalOut) || 0
            log.debug('Bandwidth stats', {
              totalIn: bw.TotalIn,
              totalOut: bw.TotalOut,
              rateIn: bw.RateIn,
              rateOut: bw.RateOut,
            })
          } else {
            log.debug('Bandwidth: пустой первый чанк', { text: text.slice(0, 200) })
          }
        }
      }
    } catch (e) {
      // AbortError после ac.abort() — ожидаемо, не логируем
      if (e instanceof Error && e.name !== 'AbortError') {
        log.debug('Не удалось получить bandwidth stats', { error: String(e) })
      }
    }

    try {
      const repoRes = await fetch(`${apiUrl}/api/v0/repo/stat`, {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
      })
      if (repoRes.ok) {
        const repo = (await repoRes.json()) as { RepoSize?: number }
        baseStatus.blockstoreSize = Number(repo.RepoSize) || 0
      }
    } catch (e) {
      log.debug('Не удалось получить repo stats', { error: String(e) })
    }
  }

  // NAT status — пока оставляем unknown (сложно определить через API)
  // TODO: можно анализировать swarm addrs для определения

  return baseStatus
}
