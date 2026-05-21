/**
 * Типы для синхронизации Kubo peers из API трекера
 *
 * API: GET https://animatrona-tracker.letar.best/api/pin-servers/public
 * Контракт согласован с OrangeCompass (commit fb25ca872 в tracker).
 */

/** Один сервер в ответе API */
export interface PinServer {
  /** Уникальный ID записи в tracker БД */
  id: string
  /** Человекочитаемое имя (для UI и логов) */
  name: string
  /** Роль сервера */
  role: 'pinner' | 'relay' | 'gateway'
  /** PeerId libp2p */
  peerId: string
  /** Адреса libp2p (TCP + QUIC вместе — bitswap выберет живой) */
  multiaddrs: string[]
  /** Куда добавлять в Kubo config */
  peeringRole: 'bootstrap' | 'peering' | 'both'
}

/** Ответ API /api/pin-servers/public */
export interface PinServerResponse {
  version: number
  /** ISO timestamp последнего обновления списка в tracker */
  updatedAt: string
  servers: PinServer[]
}

/** Cache-формат (ответ API + локальная метка сохранения) */
export interface PinServerCache extends PinServerResponse {
  savedAt: number
}

/** Источник текущих peers в runtime */
export type PeerSyncSource = 'api' | 'cache' | 'hardcoded'

/** Статус синхронизации (для UI) */
export interface PeerSyncStatus {
  /** Текущий список серверов */
  peers: PinServer[]
  /**
   * Unix ms последнего УСПЕШНОГО ответа API.
   * `null` если API ни разу не отвечал успешно за время жизни процесса
   * (даже если данные взяты из cache/hardcoded).
   */
  lastSyncAt: number | null
  /**
   * ISO-строка `updatedAt` из последнего ответа API (или cache fallback).
   * Это «когда tracker последний раз обновил список серверов», не «когда мы получили».
   */
  lastResponseUpdatedAt: string | null
  /** Unix ms последнего reconnect cycle */
  lastReconnectAt: number | null
  /** Источник данных */
  source: PeerSyncSource
  /** Последняя ошибка API (если есть) */
  lastError: string | null
}

/** Результат syncNow() */
export interface PeerSyncResult {
  success: boolean
  source: PeerSyncSource
  peersCount: number
  addedCount: number
  removedCount: number
  error?: string
}

/**
 * Whitelist PeerId для безопасного удаления устаревших peers из Kubo config.
 *
 * При sync мы удаляем из Bootstrap/Peering ТОЛЬКО peers, PeerId которых в этом
 * whitelist, но отсутствуют в ответе API. Это защищает libp2p public bootstrap
 * nodes и ручные добавления пользователя от случайного удаления.
 *
 * Список должен содержать ВСЕ известные исторические pinner/relay/gateway peers.
 */
export const KNOWN_PINNER_PEER_IDS: ReadonlySet<string> = new Set([
  // Pinner1 (mail) — актуален
  '12D3KooWLJ3juXbEmfhBu4YTWBKQJCkgC5k9N8SMeBqTzscSxq9j',
  // Pinner2 (130.12.46.31) — списан (OOM, плохой HDD), надо удалить из конфига
  '12D3KooWR9QwdLbXcqfP6BCFuzSaMZ9NxW7249cJbW5jHrTftnq3',
  // Pinner3 (188.127.235.38) — актуален
  '12D3KooWP5hrqw8HHXUGaepSSRhsa8isoTAbcnRnKkjgHhWRLxiV',
  // Relay (mail) — в Peering НЕ добавляем, но в whitelist для удаления если вдруг окажется
  '12D3KooWJYUBfi5RmMC8WU74nf7C26KTdAeftM6msYyg9995PkgA',
  // Gateway (s2) — актуален
  '12D3KooWJtQXuNd4g5w3fH7bCSj4o4DA1PLBFjRGowiBbf6zqxa6',
])
