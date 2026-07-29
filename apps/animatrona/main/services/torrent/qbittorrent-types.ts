/**
 * Типы qBittorrent Web API v2
 *
 * Документация: https://github.com/qbittorrent/qBittorrent/wiki/WebUI-API-(qBittorrent-4.1)
 */

/** Конфигурация подключения к qBittorrent */
export interface QBittorrentConfig {
  /** URL Web UI (дефолт http://localhost:8080) */
  url: string
  /** Логин (дефолт admin) */
  username: string
  /** Пароль */
  password: string
}

/** Состояние торрента в qBittorrent (сырые значения API) */
export type QBTorrentState =
  | 'error'
  | 'missingFiles'
  | 'uploading'
  | 'pausedUP'
  | 'stoppedUP'
  | 'queuedUP'
  | 'stalledUP'
  | 'checkingUP'
  | 'forcedUP'
  | 'allocating'
  | 'downloading'
  | 'metaDL'
  | 'pausedDL'
  | 'stoppedDL'
  | 'queuedDL'
  | 'stalledDL'
  | 'checkingDL'
  | 'forcedDL'
  | 'checkingResumeData'
  | 'moving'
  | 'unknown'

/** Фильтр для getTorrents */
export type QBTorrentFilter =
  | 'all'
  | 'downloading'
  | 'seeding'
  | 'completed'
  | 'paused'
  | 'active'
  | 'inactive'
  | 'resumed'
  | 'stalled'
  | 'stalled_uploading'
  | 'stalled_downloading'
  | 'errored'

/** Информация о торренте */
export interface QBTorrentInfo {
  hash: string
  name: string
  state: QBTorrentState
  /** Прогресс 0..1 */
  progress: number
  /** Скорость скачивания байт/сек */
  dlspeed: number
  /** Скорость отдачи байт/сек */
  upspeed: number
  /** ETA в секундах (8640000 = infinity) */
  eta: number
  /** Ratio uploaded/downloaded */
  ratio: number
  /** Общий размер в байтах */
  size: number
  /** Скачано байт */
  downloaded: number
  /** Отдано байт */
  uploaded: number
  /** Время добавления (unix timestamp) */
  added_on: number
  /** Время завершения (0 если не завершён) */
  completion_on: number
  /** Папка сохранения */
  save_path: string
  /** Категория */
  category: string
  /** Теги (строка через запятую) */
  tags: string
  /** Количество сидов (включая нас) */
  num_seeds: number
  /** Количество личеров */
  num_leechs: number
  /** Magnet URI (может отсутствовать в некоторых ответах) */
  magnet_uri?: string
  /** infohash v1 */
  infohash_v1?: string
  /** infohash v2 */
  infohash_v2?: string
}

/** Информация о файле в торренте */
export interface QBTorrentFile {
  /** Индекс файла */
  index: number
  /** Имя файла (может включать подпапки) */
  name: string
  /** Размер в байтах */
  size: number
  /** Прогресс скачивания 0..1 */
  progress: number
  /** Приоритет: 0=skip, 1=normal, 6=high, 7=maximal */
  priority: 0 | 1 | 6 | 7
  /** Доступность 0..1 (не всегда присутствует) */
  availability?: number
  /** Диапазон фрагментов, к которым относится файл */
  piece_range?: [number, number]
  /** Файл полностью доступен */
  is_seed?: boolean
}

/** Глобальная статистика передачи */
export interface QBTransferInfo {
  /** Глобальная скорость скачивания байт/сек */
  dl_info_speed: number
  /** Глобально скачано байт */
  dl_info_data: number
  /** Глобальная скорость отдачи байт/сек */
  up_info_speed: number
  /** Глобально отдано байт */
  up_info_data: number
  /** Лимит скачивания в байт/сек (0 = без лимита) */
  dl_rate_limit: number
  /** Лимит отдачи в байт/сек (0 = без лимита) */
  up_rate_limit: number
  /** Количество сидов DHT */
  dht_nodes: number
  /** Статус подключения */
  connection_status: 'connected' | 'firewalled' | 'disconnected'
}

/** Ответ /api/v2/sync/maindata — дельты с последнего запроса */
export interface QBSyncResponse {
  /** Response ID (используется в следующем запросе) */
  rid: number
  /** Полный ответ (true) или дельта (false) */
  full_update?: boolean
  /** Торренты (только изменённые при дельте) */
  torrents?: Record<string, Partial<QBTorrentInfo>>
  /** Удалённые торренты */
  torrents_removed?: string[]
  /** Категории (только изменённые) */
  categories?: Record<string, unknown>
  /** Удалённые категории */
  categories_removed?: string[]
  /** Теги */
  tags?: string[]
  /** Удалённые теги */
  tags_removed?: string[]
  /** Глобальная статистика */
  server_state?: Partial<QBTransferInfo>
}

/** Свойства торрента (/api/v2/torrents/properties) — только используемые поля */
export interface QBTorrentProperties {
  /** Комментарий раздачи — у торрентов, добавленных вручную, часто содержит ссылку на страницу источника */
  comment: string
}

/** Параметры добавления магнет-ссылки */
export interface QBAddTorrentParams {
  /** Магнет-ссылка (можно несколько, разделённых \n) */
  urls: string
  /** Папка для скачивания */
  savepath?: string
  /** Категория для группировки */
  category?: string
  /** Не запускать сразу (для настройки перед стартом) */
  paused?: boolean
  /** Последовательная загрузка (для стриминга) */
  sequentialDownload?: boolean
  /** Скачивать сначала и последний кусок (для стриминга) */
  firstLastPiecePrio?: boolean
}
