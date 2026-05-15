/**
 * Remote Pinning типы для Animatrona
 *
 * Типы для интеграции с внешними pinning сервисами.
 * Поддерживаемые провайдеры: Pinata, Filecoin (в будущем)
 */

/**
 * Поддерживаемые провайдеры remote pinning
 */
export type RemotePinProvider = 'pinata'

/**
 * Конфигурация провайдера Pinata
 */
export interface PinataConfig {
  /** Включён ли провайдер */
  enabled: boolean
  /** JWT токен (рекомендуется) */
  jwt: string
  /** Кастомный gateway URL */
  gatewayUrl?: string
}

/**
 * Статус remote pin
 */
export type RemotePinStatus =
  | 'queued' // В очереди на пининг (searching)
  | 'pinning' // Идёт пининг (retrieving)
  | 'pinned' // Успешно закреплён
  | 'failed' // Ошибка пининга (expired)
  | 'unpinned' // Откреплён

/**
 * Remote pin запись
 */
export interface RemotePin {
  /** ID пина на стороне Pinata */
  id: string
  /** CID контента */
  cid: string
  /** Название */
  name: string
  /** Статус */
  status: RemotePinStatus
  /** Размер в байтах */
  size: number
  /** Дата создания */
  createdAt: string
  /** Метаданные */
  metadata?: Record<string, string>
}

/**
 * Опции для создания remote pin
 */
export interface RemotePinOptions {
  /** Название пина */
  name?: string
  /** Метаданные (ключ-значение) */
  metadata?: Record<string, string>
  /** Host nodes для ускорения пининга (multiaddrs) */
  hostNodes?: string[]
}

/**
 * Результат операции remote pinning
 */
export interface RemotePinResult<T = RemotePin> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Статистика Pinata аккаунта
 */
export interface PinataStats {
  /** Количество пинов */
  pinCount: number
  /** Общий размер в байтах */
  totalSize: number
  /** Количество пинов (алиас для UI) */
  totalPins: number
  /** Лимит размера пинов (из плана) */
  pinSizeLimit: number
}

/**
 * Общая конфигурация remote pinning
 */
export interface RemotePinConfig {
  /** Конфигурация Pinata */
  pinata: PinataConfig
  /** Автоматически пинить новый локальный контент */
  autoPinEnabled: boolean
}

/**
 * Дефолтная конфигурация
 */
export const DEFAULT_REMOTE_PIN_CONFIG: RemotePinConfig = {
  pinata: {
    enabled: false,
    jwt: '',
    gatewayUrl: 'https://gateway.pinata.cloud',
  },
  autoPinEnabled: false,
}

/**
 * Информация о провайдере для UI
 */
export interface ProviderInfo {
  id: RemotePinProvider
  name: string
  description: string
  websiteUrl: string
  docsUrl: string
  freeQuota: string
}

/**
 * Информация о Pinata
 */
export const PINATA_INFO: ProviderInfo = {
  id: 'pinata',
  name: 'Pinata',
  description: 'Популярный IPFS pinning сервис с бесплатным планом 1 GB',
  websiteUrl: 'https://pinata.cloud',
  docsUrl: 'https://docs.pinata.cloud',
  freeQuota: '1 GB',
}

/**
 * Pinata Pin Job Status (для Pin by CID)
 */
export type PinataPinJobStatus =
  | 'prechecking' // Проверка перед поиском
  | 'searching' // Поиск контента в сети
  | 'retrieving' // Получение контента
  | 'expired' // Не найдено за 24 часа
  | 'over_free_limit' // Превышен лимит
  | 'over_max_size' // Слишком большой файл
  | 'invalid_object' // Невалидный объект
  | 'bad_host_node' // Недоступный host node

/**
 * Pinata Pin Job (для отслеживания Pin by CID)
 */
export interface PinataPinJob {
  /** ID задачи */
  id: string
  /** CID */
  ipfsPinHash: string
  /** Дата создания */
  dateQueued: string
  /** Название */
  name?: string
  /** Статус */
  status: PinataPinJobStatus
  /** Host nodes */
  hostNodes?: string[]
}

/**
 * Ответ Pinata API — список пинов
 */
export interface PinataListResponse {
  count: number
  rows: Array<{
    id: string
    ipfs_pin_hash: string
    size: number
    user_id: string
    date_pinned: string
    date_unpinned: string | null
    metadata: {
      name?: string
      keyvalues?: Record<string, string>
    }
  }>
}
