/**
 * Federation типы для Animatrona
 *
 * Типы для федеративной системы трекеров на основе ActivityPub.
 * Обеспечивает синхронизацию контента между независимыми Animatrona инстансами.
 */

// ============================================================================
// Trust System
// ============================================================================

/**
 * Уровни доверия к трекерам
 */
export enum TrustLevel {
  /** Заблокирован — никакие операции не разрешены */
  BLOCKED = 0,
  /** Не доверенный — по умолчанию для новых трекеров */
  UNTRUSTED = 1,
  /** Известный — проверенный пользователем */
  KNOWN = 2,
  /** Доверенный — автоматический импорт контента */
  TRUSTED = 3,
  /** Верифицированный — полное доверие */
  VERIFIED = 4,
}

/**
 * Метаданные для расчёта trust score
 */
export interface TrustMetrics {
  /** Процент uptime (0-100) */
  uptimePercent: number
  /** Среднее время ответа в мс */
  avgResponseTimeMs: number
  /** Качество контента (0-1) */
  contentQuality: number
  /** Количество успешных синхронизаций */
  successfulSyncs: number
  /** Количество неудачных синхронизаций */
  failedSyncs: number
  /** Последняя проверка */
  lastCheckedAt: string | null
}

// ============================================================================
// ActivityPub Types
// ============================================================================

/**
 * ActivityPub контексты
 */
export const ACTIVITYPUB_CONTEXT = 'https://www.w3.org/ns/activitystreams'
export const SECURITY_CONTEXT = 'https://w3id.org/security/v1'

/**
 * ActivityPub Public Key
 */
export interface ActivityPubPublicKey {
  /** ID ключа (обычно actor#main-key) */
  id: string
  /** Владелец ключа */
  owner: string
  /** PEM-кодированный публичный ключ RSA */
  publicKeyPem: string
}

/**
 * ActivityPub Actor — представляет Animatrona трекер
 */
export interface ActivityPubActor {
  '@context': string[]
  /** Уникальный ID актора (URL трекера) */
  id: string
  /** Тип — всегда Service для трекеров */
  type: 'Service'
  /** Название трекера */
  name: string
  /** URL описание */
  summary?: string
  /** URL к иконке трекера */
  icon?: {
    type: 'Image'
    url: string
  }
  /** Inbox для входящих activities */
  inbox: string
  /** Outbox для исходящих activities */
  outbox: string
  /** Публичный ключ для верификации подписей */
  publicKey: ActivityPubPublicKey
  /** Endpoints трекера */
  endpoints: {
    /** URL для получения контента */
    content: string
    /** URL для получения announces (сидеров) */
    announces: string
  }
  /** Метаданные трекера */
  'animatrona:metadata': TrackerMetadata
}

/**
 * Метаданные трекера Animatrona
 */
export interface TrackerMetadata {
  /** Тема контента (anime, drama, movie и т.д.) */
  theme: string
  /** Основной язык контента */
  language: string
  /** Версия Animatrona */
  version: string
  /** Статистика */
  stats: {
    /** Количество аниме в библиотеке */
    animeCount: number
    /** Количество эпизодов */
    episodeCount: number
    /** Общий размер контента в байтах */
    totalSize: number
  }
}

/**
 * ActivityPub Activity (базовый тип)
 */
export interface ActivityPubActivity {
  '@context': string[]
  id: string
  type: string
  actor: string
  published?: string
}

/**
 * Announce Activity — объявление о доступности контента
 */
export interface AnnounceActivity extends ActivityPubActivity {
  type: 'Announce'
  /** CID объявляемого контента */
  object: string
  /** PeerId для скачивания */
  'animatrona:peerId': string
  /** Размер в байтах */
  'animatrona:size': number
}

/**
 * Create Activity — создание нового контента
 */
export interface CreateActivity extends ActivityPubActivity {
  type: 'Create'
  object: VideoSeriesObject
}

/**
 * Update Activity — обновление контента
 */
export interface UpdateActivity extends ActivityPubActivity {
  type: 'Update'
  object: VideoSeriesObject
}

/**
 * Delete Activity — удаление контента
 */
export interface DeleteActivity extends ActivityPubActivity {
  type: 'Delete'
  object: string // ID удаляемого объекта
}

/**
 * VideoSeries Object — аниме-контент для федерации
 */
export interface VideoSeriesObject {
  '@context': string[]
  /** Уникальный ID (URL) */
  id: string
  type: 'VideoSeries'
  /** Название на основном языке */
  name: string
  /** Оригинальное название */
  originalName?: string
  /** Год выпуска */
  year?: number
  /** Описание */
  summary?: string
  /** CID постера */
  posterCid?: string
  /** Внешние ID для дедупликации */
  externalIds: {
    mal?: number
    anilist?: number
    shikimori?: number
    anidb?: number
  }
  /** Эпизоды */
  episodes: VideoEpisodeObject[]
  /** Дата публикации */
  published: string
  /** Дата обновления */
  updated: string
}

/**
 * VideoEpisode Object — эпизод для федерации
 */
export interface VideoEpisodeObject {
  /** Номер эпизода */
  number: number
  /** Название */
  name?: string
  /** CID видео */
  cid: string
  /** Размер в байтах */
  size: number
  /** Длительность в мс */
  durationMs?: number
  /** Аудиодорожки */
  audioTracks?: Array<{
    language: string
    dubGroup?: string
    cid: string
  }>
  /** Субтитры */
  subtitles?: Array<{
    language: string
    dubGroup?: string
    cid: string
  }>
}

// ============================================================================
// WebFinger
// ============================================================================

/**
 * WebFinger Link
 */
export interface WebFingerLink {
  rel: string
  type?: string
  href?: string
  template?: string
}

/**
 * WebFinger Response (RFC 7033)
 */
export interface WebFingerResponse {
  subject: string
  aliases?: string[]
  links: WebFingerLink[]
}

// ============================================================================
// HTTP Signatures
// ============================================================================

/**
 * HTTP Signature Headers
 */
export interface SignatureHeaders {
  /** Signature header value */
  Signature: string
  /** Date header */
  Date: string
  /** Digest header (для POST запросов) */
  Digest?: string
}

/**
 * Parsed HTTP Signature
 */
export interface ParsedSignature {
  keyId: string
  algorithm: string
  headers: string[]
  signature: string
}

// ============================================================================
// Sync
// ============================================================================

/**
 * Результат синхронизации с трекером
 */
export interface SyncResult {
  /** URL трекера */
  tracker: string
  /** Количество импортированных записей */
  imported: number
  /** Количество обновлённых записей */
  updated: number
  /** Количество пропущенных (уже есть) */
  skipped: number
  /** Ошибки */
  errors: string[]
  /** Время синхронизации */
  syncedAt: string
}

/**
 * Опции синхронизации
 */
export interface SyncOptions {
  /** Синхронизировать контент начиная с этой даты */
  since?: string
  /** Лимит записей */
  limit?: number
  /** Принудительно переписать существующие */
  force?: boolean
  /** Автоматически пиннить контент */
  autoPin?: boolean
}

/**
 * Статус синхронизации
 */
export type SyncStatus = 'idle' | 'syncing' | 'error'

// ============================================================================
// Seeder Aggregation
// ============================================================================

/**
 * Информация о сидере
 */
export interface SeederInfo {
  /** PeerId сидера */
  peerId: string
  /** URL трекера, который сообщил о сидере */
  trackerUrl: string
  /** Когда был замечен */
  lastSeenAt: string
}

/**
 * Агрегированная статистика сидеров для CID
 */
export interface GlobalSeederStats {
  /** CID контента */
  cid: string
  /** Количество уникальных сидеров */
  seederCount: number
  /** Список сидеров */
  seeders: SeederInfo[]
  /** Последнее обновление */
  updatedAt: string
}

// ============================================================================
// Tracker
// ============================================================================

/**
 * Данные трекера для хранения (без ID и дат)
 */
export interface TrackerData {
  /** URL трекера */
  url: string
  /** Название */
  name: string
  /** Описание */
  description?: string
  /** Тема контента */
  theme: string
  /** Язык */
  language: string
  /** Публичный ключ (PEM) */
  publicKeyPem?: string
  /** Уровень доверия */
  trustLevel: TrustLevel
  /** Заблокирован */
  isBlocked?: boolean
  /** Метрики */
  uptimePercent?: number
  avgResponseTimeMs?: number
  contentQuality?: number
  successfulSyncs?: number
  failedSyncs?: number
  /** Количество синхронизированного контента */
  contentSynced?: number
  /** Последняя синхронизация */
  lastSyncAt?: string
  /** Последняя проверка */
  lastCheckedAt?: string
}

/**
 * Информация о трекере (для UI)
 */
export interface TrackerInfo {
  /** ID в БД */
  id: string
  /** URL трекера */
  url: string
  /** Название */
  name: string
  /** Описание */
  description?: string
  /** Тема контента */
  theme: string
  /** Язык */
  language: string
  /** Уровень доверия */
  trustLevel: TrustLevel
  /** Метрики */
  metrics: TrustMetrics
  /** Количество синхронизированного контента */
  contentSynced: number
  /** Последняя синхронизация */
  lastSyncAt: string | null
  /** Дата добавления */
  createdAt: string
}

/**
 * Опции добавления трекера
 */
export interface AddTrackerOptions {
  /** URL трекера */
  url: string
  /** Имя (опционально, будет получено через WebFinger) */
  name?: string
  /** Начальный уровень доверия */
  trustLevel?: TrustLevel
}

// ============================================================================
// Federation Settings
// ============================================================================

/**
 * Настройки федерации
 */
export interface FederationSettings {
  /** Федерация включена */
  enabled: boolean
  /** Название этого трекера */
  trackerName: string
  /** Описание этого трекера */
  trackerDescription?: string
  /** Тема контента */
  theme: string
  /** Язык контента */
  language: string
  /** Автоматическая синхронизация */
  autoSync: boolean
  /** Интервал синхронизации в минутах */
  syncIntervalMinutes: number
  /** Минимальный trust level для автоимпорта */
  minTrustForAutoImport: TrustLevel
  /** Публичный ключ (PEM) */
  publicKeyPem?: string
  /** Есть ли приватный ключ */
  hasPrivateKey: boolean
}

/**
 * Дефолтные настройки федерации
 */
export const DEFAULT_FEDERATION_SETTINGS: FederationSettings = {
  enabled: false,
  trackerName: 'My Animatrona',
  theme: 'anime',
  language: 'ru',
  autoSync: true,
  syncIntervalMinutes: 60,
  minTrustForAutoImport: TrustLevel.TRUSTED,
  hasPrivateKey: false,
}

// ============================================================================
// Federated Content
// ============================================================================

/**
 * Данные федеративного контента для хранения
 */
export interface FederatedContentData {
  /** ID трекера */
  trackerId: string
  /** Удалённый ID контента */
  remoteId: string
  /** Локальный ID аниме (если импортировано) */
  animeId?: string
  /** JSON сериализованный VideoSeriesObject */
  contentJson: string
  /** MAL ID для дедупликации */
  malId?: number
  /** AniList ID для дедупликации */
  anilistId?: number
  /** Shikimori ID для дедупликации */
  shikimoriId?: number
  /** World-Art ID для дедупликации */
  worldartId?: number
}

// ============================================================================
// IPC Results
// ============================================================================

/**
 * Результат операции федерации
 */
export interface FederationOperationResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Результат обнаружения трекера
 */
export interface DiscoverResult {
  /** Найденный актор */
  actor: ActivityPubActor
  /** URL трекера */
  url: string
  /** Уже добавлен */
  alreadyAdded: boolean
}

// ============================================================================
// Events
// ============================================================================

/**
 * События федерации для IPC
 */
export type FederationEventType =
  | 'federation:settingsChanged'
  | 'federation:trackerAdded'
  | 'federation:trackerRemoved'
  | 'federation:trackerUpdated'
  | 'federation:syncStarted'
  | 'federation:syncProgress'
  | 'federation:syncCompleted'
  | 'federation:syncError'

/**
 * Payload события прогресса синхронизации
 */
export interface SyncProgressEvent {
  trackerId: string
  trackerUrl: string
  progress: number // 0-100
  imported: number
  total: number
}
