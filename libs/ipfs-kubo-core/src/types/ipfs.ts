/**
 * IPFS типы для Animatrona
 *
 * Shared типы между main и renderer процессами для IPFS/Helia интеграции.
 */

/**
 * Статус NAT (Network Address Translation)
 *
 * - `public` — нода доступна напрямую из интернета
 * - `private` — нода за NAT, подключения только исходящие
 * - `unknown` — статус ещё не определён
 */
export type NatStatus = 'public' | 'private' | 'unknown'

/**
 * Диагностика P2P соединений
 *
 * Расширенная информация о состоянии сети для отладки.
 */
export interface P2PDiagnostics {
  /** Общее количество пиров */
  totalPeers: number
  /** Входящие соединения (другие пиры нашли нас) */
  inbound: number
  /** Исходящие соединения (мы нашли других) */
  outbound: number
  /** Разбивка по транспортам */
  byTransport: {
    tcp: number
    quic: number
    relay: number
    ws: number
  }
  /** Адреса, на которых мы слушаем */
  listenAddrs: string[]
  /** Наблюдаемые внешние адреса (если есть) */
  observedAddrs: string[]
}

/**
 * Статус IPFS сервиса
 */
export interface IpfsServiceStatus {
  /** Запущена ли нода */
  isRunning: boolean
  /** PeerId текущей ноды (null если не запущена) */
  peerId: string | null
  /** Количество подключённых пиров */
  connectedPeers: number
  /** Входящий трафик в байтах */
  bytesIn: number
  /** Исходящий трафик в байтах */
  bytesOut: number
  /** Размер blockstore в байтах */
  blockstoreSize: number
  /** Статус NAT (public/private/unknown) */
  natStatus: NatStatus
}

/**
 * Режим работы Kubo сервиса
 * - `external` — используется внешний IPFS Desktop
 * - `embedded` — используется встроенный Kubo
 * - `none` — сервис не запущен
 */
export type KuboMode = 'external' | 'embedded' | 'none'

/**
 * Статус Kubo (Go IPFS) сервиса
 */
export interface KuboServiceStatus {
  /** Запущен ли сервис */
  isRunning: boolean
  /** Режим работы (external = IPFS Desktop, embedded = встроенный) */
  mode: KuboMode
  /** PeerId ноды */
  peerId: string | null
  /** URL API */
  apiUrl: string | null
  /** Порт Gateway */
  gatewayPort: number | null
  /** Версия Kubo */
  version: string | null
  /** Количество подключённых пиров */
  connectedPeers: number
}

/**
 * Результат добавления контента в IPFS
 */
export interface IpfsAddResult {
  /** CID добавленного контента (v1 CID в base32) */
  cid: string
  /** Размер в байтах */
  size: number
  /** Относительный путь (для директорий) */
  path?: string
}

/**
 * Результат stat операции
 */
export interface IpfsStatResult {
  /** CID контента */
  cid: string
  /** Размер в байтах */
  size: number
  /** Количество блоков */
  blocks: number
  /** Кумулятивный размер (включая все дочерние блоки, для директорий) */
  cumulativeSize: number
  /** Тип: file, directory, raw */
  type: 'file' | 'directory' | 'raw'
  /** Локально доступен */
  local: boolean
}

/**
 * Конфигурация IPFS сервиса
 */
export interface IpfsConfig {
  /** Включить автозапуск при старте приложения */
  autoStart: boolean
  /** Максимальное количество подключений */
  maxConnections: number
  /** Минимальное количество подключений */
  minConnections: number
  /** Включить DHT discovery */
  enableDht: boolean
  /** Включить GossipSub (для IPNS) */
  enableGossipsub: boolean
}

/**
 * События IPFS сервиса
 */
export type IpfsServiceEvent =
  | { type: 'status:changed'; status: IpfsServiceStatus }
  | { type: 'peer:connected'; peerId: string }
  | { type: 'peer:disconnected'; peerId: string }
  | { type: 'error'; error: string }

/**
 * Статус HTTP Gateway
 */
export interface GatewayStatus {
  /** Запущен ли сервер */
  isRunning: boolean
  /** Порт сервера */
  port: number | null
  /** Базовый URL (http://localhost:PORT) */
  baseUrl: string | null
  /** Количество обработанных запросов */
  requestCount: number
}

/**
 * Информация о закреплённом контенте
 */
export interface PinInfo {
  /** CID контента */
  cid: string
  /** Название (опционально) */
  name?: string
  /** Размер в байтах */
  size: number
  /** Дата закрепления (ISO string) */
  pinnedAt: string
  /** Тип контента */
  type: 'file' | 'directory' | 'raw'
}

/**
 * Статистика pins
 */
export interface PinStats {
  /** Общее количество pins */
  count: number
  /** Общий размер в байтах */
  totalSize: number
}

/**
 * Результат публикации IPNS
 */
export interface IpnsPublishResult {
  /** IPNS имя (PeerId в base58btc) */
  name: string
  /** CID на который указывает имя */
  cid: string
  /** Время истечения записи (ISO string) */
  expiry: string
}

/**
 * Результат разрешения IPNS
 */
export interface IpnsResolveResult {
  /** Разрешённый CID */
  cid: string
  /** Путь внутри CID (если был указан) */
  path?: string
}

// === P2P Sharing ===

/**
 * Опубликованная библиотека (формат данных для P2P Sharing)
 *
 * Это JSON, который публикуется через IPNS и доступен подписчикам.
 */
export interface PublishedLibrary {
  /** Версия формата (для обратной совместимости) */
  version: 1
  /** PeerId владельца библиотеки */
  peerId: string
  /** Имя владельца (никнейм) */
  name: string
  /** Когда библиотека была обновлена */
  updatedAt: string
  /** Список аниме в библиотеке */
  animes: PublishedAnime[]
}

/**
 * Аниме в опубликованной библиотеке
 */
export interface PublishedAnime {
  /** Название */
  name: string
  /** Оригинальное название (японское) */
  originalName?: string
  /** Год выпуска */
  year?: number
  /** CID постера (если загружен в IPFS) */
  posterCid?: string
  /** CID корневой IPFS-директории аниме */
  directoryCid?: string
  /** Количество IPFS блоков в директории (для прогресса пиннинга) */
  directoryBlocks?: number
  /** Размер директории в байтах */
  directorySize?: number
  /** Эпизоды */
  episodes: PublishedEpisode[]
}

/**
 * Эпизод в опубликованной библиотеке
 */
export interface PublishedEpisode {
  /** Номер эпизода */
  number: number
  /** Название эпизода */
  name?: string
  /** CID транскодированного файла */
  cid: string
  /** Размер в байтах */
  size: number
  /** Длительность в секундах */
  duration: number
}

/**
 * Подписка на библиотеку другого пользователя
 */
export interface Subscription {
  /** ID подписки */
  id: string
  /** IPNS имя (PeerId) владельца */
  ipnsName: string
  /** Отображаемое имя */
  displayName: string
  /** Последний известный CID библиотеки */
  lastKnownCid: string | null
  /** Когда последний раз проверяли */
  lastCheckedAt: string | null
  /** Автопининг контента */
  autoPin: boolean
  /** Лимит автопининга в байтах */
  autoPinLimit: number
  /** Дата создания */
  createdAt: string
  /** Дата обновления */
  updatedAt: string
}

/**
 * Данные для создания подписки
 */
export interface SubscriptionCreateData {
  /** IPNS имя (PeerId) владельца */
  ipnsName: string
  /** Отображаемое имя */
  displayName: string
  /** Включить автопининг */
  autoPin?: boolean
  /** Лимит автопининга в байтах */
  autoPinLimit?: number
}

/**
 * Результат обновления подписки
 */
export interface SubscriptionRefreshResult {
  /** Подписка */
  subscription: Subscription
  /** Новый CID (если обновился) */
  newCid: string | null
  /** Библиотека (если удалось получить) */
  library: PublishedLibrary | null
  /** Есть ли обновления */
  hasUpdates: boolean
}

// === Library Publishing ===

/**
 * Конфигурация публикации библиотеки
 */
export interface PublisherConfig {
  /** Имя библиотеки (отображается подписчикам) */
  libraryName: string
  /** Включена ли публикация */
  enabled: boolean
  /** Последний опубликованный CID */
  lastPublishedCid: string | null
  /** Когда последний раз публиковали */
  lastPublishedAt: string | null
  /** Автопубликация при изменениях */
  autoPublish: boolean
}

/**
 * Результат публикации библиотеки
 */
export interface PublishResult {
  /** CID опубликованной библиотеки */
  cid: string
  /** IPNS имя */
  ipnsName: string
  /** Когда опубликовано */
  publishedAt: string
  /** Количество аниме */
  animeCount: number
  /** Количество эпизодов */
  episodeCount: number
}

/**
 * Прогресс публикации
 */
export interface PublishProgress {
  /** Этап: loading, generating, publishing */
  stage: 'loading' | 'generating' | 'publishing'
  /** Текущий элемент */
  current: number
  /** Всего элементов */
  total: number
}

/**
 * Данные аниме для публикации (из БД)
 */
export interface AnimePublishData {
  id: string
  name: string
  originalName: string | null
  year: number | null
  posterPath: string | null
  episodes: EpisodePublishData[]
}

/**
 * Данные эпизода для публикации (из БД)
 */
export interface EpisodePublishData {
  id: string
  number: number
  name: string | null
  transcodedCid: string | null
  durationMs: number | null
}

// === Subscription Scheduler ===

/**
 * Конфигурация планировщика подписок
 */
export interface SchedulerConfig {
  /** Включено ли автообновление */
  enabled: boolean
  /** Интервал проверки в минутах */
  intervalMinutes: number
  /** Показывать уведомления о новом контенте */
  showNotifications: boolean
  /** Автоматически пинить новый контент */
  autoPinEnabled: boolean
}

/**
 * Статус планировщика
 */
export interface SchedulerStatus {
  /** Запущен ли планировщик */
  isRunning: boolean
  /** Когда была последняя проверка */
  lastCheckAt: string | null
  /** Текущая конфигурация */
  config: SchedulerConfig
}
