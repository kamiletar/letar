/**
 * Статистика Kubo — пиры, bandwidth, размер репо
 *
 * Функции для получения и обновления статистики IPFS ноды.
 */

import type { KuboRPCClient } from 'kubo-rpc-client' with { 'resolution-mode': 'import' }

import type { IpfsServiceStatus } from '../types/ipfs'
import { createModuleLogger } from '../utils/logger'

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

/** Трафик ноды с момента запуска */
export interface BandwidthStats {
  bytesIn: number
  bytesOut: number
  /** Мгновенная скорость — есть только в ответе Kubo, для логов */
  rateIn?: number
  rateOut?: number
}

/**
 * Прочитать первую строку NDJSON-стрима `stats/bw`.
 *
 * `stats/bw` — бесконечный стрим, поэтому `.text()` использовать нельзя: читаем первый чанк
 * через reader и сразу обрываем запрос.
 *
 * Бросает — вызывающий сам решает, что делать с ошибкой (у частого polling и у разового
 * запроса статуса разные требования к логированию).
 */
async function readBandwidthStats(apiUrl: string): Promise<BandwidthStats | null> {
  const ac = new AbortController()
  const res = await fetch(`${apiUrl}/api/v0/stats/bw`, {
    method: 'POST',
    signal: ac.signal,
  })

  if (!res.ok || !res.body) {
    return null
  }

  const reader = res.body.getReader()
  const { value } = await reader.read()
  // Прерываем стрим сразу после первого чанка
  ac.abort()
  reader.releaseLock()

  if (!value) {
    return null
  }

  const text = new TextDecoder().decode(value)
  const firstLine = text.split('\n').find((l) => l.trim())
  if (!firstLine) {
    log.debug('Bandwidth: пустой первый чанк', { text: text.slice(0, 200) })
    return null
  }

  const bw = JSON.parse(firstLine)
  return {
    bytesIn: Number(bw.TotalIn) || 0,
    bytesOut: Number(bw.TotalOut) || 0,
    rateIn: bw.RateIn,
    rateOut: bw.RateOut,
  }
}

/**
 * Размер репозитория ноды в байтах. Тяжёлый запрос — вызывать не чаще раза в 30 секунд.
 *
 * Бросает при недоступном API: у вызывающих разные фолбэки (предыдущий кэш или ноль).
 */
async function readRepoSize(apiUrl: string): Promise<number | null> {
  const res = await fetch(`${apiUrl}/api/v0/repo/stat`, {
    method: 'POST',
    signal: AbortSignal.timeout(5000),
  })

  if (!res.ok) {
    return null
  }

  const repo = (await res.json()) as { RepoSize?: number }
  return Number(repo.RepoSize) || 0
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
        const repoSize = await readRepoSize(apiUrl)
        if (repoSize !== null) {
          cachedBlockstoreSize = repoSize
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

  const bw = await readBandwidthStats(apiUrl)
  return { bytesIn: bw?.bytesIn ?? 0, bytesOut: bw?.bytesOut ?? 0 }
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

  if (apiUrl) {
    try {
      const bw = await readBandwidthStats(apiUrl)
      if (bw) {
        baseStatus.bytesIn = bw.bytesIn
        baseStatus.bytesOut = bw.bytesOut
        log.debug('Bandwidth stats', {
          totalIn: bw.bytesIn,
          totalOut: bw.bytesOut,
          rateIn: bw.rateIn,
          rateOut: bw.rateOut,
        })
      }
    } catch (e) {
      // AbortError после обрыва стрима — ожидаемо, не логируем
      if (e instanceof Error && e.name !== 'AbortError') {
        log.debug('Не удалось получить bandwidth stats', { error: String(e) })
      }
    }

    try {
      const repoSize = await readRepoSize(apiUrl)
      if (repoSize !== null) {
        baseStatus.blockstoreSize = repoSize
      }
    } catch (e) {
      log.debug('Не удалось получить repo stats', { error: String(e) })
    }
  }

  // NAT status — пока оставляем unknown (сложно определить через API)
  // TODO: можно анализировать swarm addrs для определения

  return baseStatus
}
