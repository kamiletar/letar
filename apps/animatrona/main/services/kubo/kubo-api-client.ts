/**
 * Тонкие HTTP-обёртки над Kubo RPC API v0
 *
 * Все endpoint'ы используют POST метод (даже для чтения) — это требование
 * Kubo API. Базовый URL передаётся параметром из kuboService.getApiUrl().
 *
 * Паттерн взят из kubo-relay.ts (swarm/connect пример).
 */

import { createModuleLogger } from '../../utils/logger'

const log = createModuleLogger('KuboApiClient')

/** Конфиг запроса */
interface RequestOptions {
  /** Таймаут в миллисекундах */
  timeout?: number
}

const DEFAULT_TIMEOUT = 10_000

/**
 * Выполнить POST запрос к Kubo API с автоматической обработкой ошибок.
 *
 * @param apiUrl Базовый URL вида `http://127.0.0.1:5011`
 * @param path Путь endpoint'а (начинается с /)
 * @param opts Опции
 */
async function kuboRequest(
  apiUrl: string,
  path: string,
  opts: RequestOptions = {},
): Promise<Response> {
  const url = `${apiUrl.replace(/\/+$/, '')}${path}`
  const response = await fetch(url, {
    method: 'POST',
    signal: AbortSignal.timeout(opts.timeout ?? DEFAULT_TIMEOUT),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Kubo API ${path} failed: HTTP ${response.status} ${text}`)
  }
  return response
}

// ========================
// Config API
// ========================

/**
 * Прочитать значение конфига по ключу.
 *
 * @example
 * const bootstrap = await configGet(apiUrl, 'Bootstrap')
 * // → { Key: 'Bootstrap', Value: [...] }
 */
export async function configGet(apiUrl: string, key: string): Promise<unknown> {
  const res = await kuboRequest(apiUrl, `/api/v0/config?arg=${encodeURIComponent(key)}`)
  const data = (await res.json()) as { Key: string; Value: unknown }
  return data.Value
}

/**
 * Записать значение конфига (JSON).
 *
 * @example
 * await configSet(apiUrl, 'Peering', { Peers: [...] })
 */
export async function configSet(apiUrl: string, key: string, value: unknown): Promise<void> {
  const json = encodeURIComponent(JSON.stringify(value))
  await kuboRequest(
    apiUrl,
    `/api/v0/config?arg=${encodeURIComponent(key)}&arg=${json}&json=true`,
  )
  log.debug('configSet', { key })
}

// ========================
// Bootstrap API
// ========================

/** Получить список bootstrap нод */
export async function bootstrapList(apiUrl: string): Promise<string[]> {
  const res = await kuboRequest(apiUrl, '/api/v0/bootstrap/list')
  const data = (await res.json()) as { Peers: string[] }
  return data.Peers ?? []
}

/** Добавить bootstrap ноду */
export async function bootstrapAdd(apiUrl: string, multiaddr: string): Promise<void> {
  await kuboRequest(apiUrl, `/api/v0/bootstrap/add?arg=${encodeURIComponent(multiaddr)}`)
  log.debug('bootstrapAdd', { multiaddr })
}

/** Удалить bootstrap ноду */
export async function bootstrapRm(apiUrl: string, multiaddr: string): Promise<void> {
  await kuboRequest(apiUrl, `/api/v0/bootstrap/rm?arg=${encodeURIComponent(multiaddr)}`)
  log.debug('bootstrapRm', { multiaddr })
}

// ========================
// Swarm API
// ========================

/** Подключиться к peer по multiaddr */
export async function swarmConnect(apiUrl: string, multiaddr: string): Promise<void> {
  try {
    await kuboRequest(apiUrl, `/api/v0/swarm/connect?arg=${encodeURIComponent(multiaddr)}`)
    log.debug('swarmConnect', { multiaddr })
  } catch (error) {
    // Swarm connect часто фейлится при network issues — логируем и продолжаем
    log.warn('swarmConnect failed', { multiaddr, error: String(error) })
  }
}

/**
 * Отключиться от peer.
 *
 * Для disconnect принимает multiaddr в формате `/p2p/{peerId}` или полный адрес.
 */
export async function swarmDisconnect(apiUrl: string, peerIdOrAddr: string): Promise<void> {
  const arg = peerIdOrAddr.startsWith('/') ? peerIdOrAddr : `/p2p/${peerIdOrAddr}`
  try {
    await kuboRequest(apiUrl, `/api/v0/swarm/disconnect?arg=${encodeURIComponent(arg)}`)
    log.debug('swarmDisconnect', { arg })
  } catch (error) {
    // Если peer уже disconnected — не ошибка
    log.debug('swarmDisconnect failed (maybe already disconnected)', {
      arg,
      error: String(error),
    })
  }
}
