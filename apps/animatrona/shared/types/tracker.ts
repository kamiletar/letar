/**
 * Типы для интеграции с animatrona-tracker
 */

/** Конфигурация подключения к tracker */
export interface TrackerConfig {
  /** URL трекера (например, https://animatrona-tracker.letar.best) */
  baseUrl: string
  /** API ключ для аутентификации */
  apiKey: string
  /** Включена ли публикация */
  enabled: boolean
}

/** Результат публикации на tracker */
export interface TrackerPublishResult {
  success: boolean
  /** ID аниме на tracker */
  animeId?: string
  /** Статус (PENDING / PUBLISHED) */
  status?: string
  /** Количество эпизодов */
  episodeCount?: number
  /** Сообщение об ошибке */
  error?: string
  /** Является ли кандидатом на замену существующей раздачи */
  isReplacement?: boolean
  /** ID аниме, которое может быть заменено */
  replacesAnimeId?: string
}

/** Результат проверки подключения */
export interface TrackerConnectionResult {
  success: boolean
  message: string
  trackerName?: string
}

/** Раздача, зарегистрированная на трекере */
export interface TrackerDistribution {
  /** ID раздачи на трекере */
  id: string
  /** CID раздаваемого контента */
  cid: string
  /** Peer ID раздающего узла */
  peerId: string
  /** ID аниме на трекере (опционально) */
  animeId?: string
  /** Размер контента в байтах */
  size: number
  /** Статус */
  status: 'ACTIVE' | 'PAUSED' | 'OFFLINE'
}

/** Результат регистрации раздачи */
export interface TrackerDistributionResult {
  success: boolean
  distribution?: TrackerDistribution
  error?: string
}

// ============================================================================
// Cloud Library — Облачная библиотека
// ============================================================================

/** Аниме из каталога трекера */
export interface TrackerCatalogAnime {
  id: string
  title: string
  titleOriginal: string | null
  coverUrl: string | null
  manifestCid: string
  directoryCid: string | null
  shikimoriId: number | null
  year: number | null
  studio: string | null
  genres: string[]
  episodes?: Array<{ number: number; title: string | null; duration: number | null }>
  /** Количество эпизодов (из трекера, вместо массива episodes) */
  episodeCount?: number
}

/** Детальная информация об аниме с трекера (включает описание и эпизоды с videoCid) */
export interface TrackerAnimeDetail extends TrackerCatalogAnime {
  description: string | null
  episodes: Array<{
    id: string
    number: number
    title: string | null
    duration: number | null
    videoCid: string
  }>
}

/** Результат запроса деталей аниме */
export interface TrackerAnimeDetailResult {
  success: boolean
  data?: TrackerAnimeDetail
  error?: string
}

/** Результат запроса каталога */
export interface TrackerCatalogResult {
  success: boolean
  data?: TrackerCatalogAnime[]
  total?: number
  error?: string
}

/** Элемент библиотеки с трекера */
export interface TrackerLibraryItem {
  id: string
  watchStatus: string
  userRating: number | null
  pinnedLocally: boolean
  addedAt: string
  anime: {
    id: string
    title: string
    titleOriginal: string | null
    coverUrl: string | null
    manifestCid: string
    directoryCid: string | null
    shikimoriId: number | null
    year: number | null
    studio: string | null
    genres: string[]
    episodes: Array<{ number: number; title: string | null; duration: number | null }>
  }
  watchProgress: Array<{
    episodeNumber: number
    currentTime: number
    completed: boolean
    updatedAt?: string
  }>
}

/** Элемент синхронизации (Desktop → Tracker) */
export interface TrackerSyncItem {
  directoryCid: string
  /** @deprecated TODO: удалить после миграции всех клиентов на directoryCid */
  manifestCid?: string
  shikimoriId?: number
  watchStatus?: string
  userRating?: number | null
  pinnedLocally?: boolean
  /** ISO string — для conflict resolution (last-write-wins) */
  updatedAt?: string
  watchProgress?: Array<{
    episodeNumber: number
    currentTime: number
    completed: boolean
    /** ISO string — для conflict resolution */
    updatedAt?: string
  }>
}

/** Серверный элемент библиотеки (Tracker → Desktop) в bidirectional sync */
export interface TrackerServerItem {
  directoryCid?: string
  /** @deprecated TODO: удалить после миграции всех клиентов на directoryCid */
  manifestCid: string
  /** Shikimori ID для матча при смене directoryCid (обновление раздачи) */
  shikimoriId?: number | null
  watchStatus: string
  userRating: number | null
  updatedAt: string
  watchProgress: Array<{
    episodeNumber: number
    currentTime: number
    completed: boolean
    updatedAt: string
  }>
}

/** Результат синхронизации */
export interface TrackerSyncResult {
  success: boolean
  synced?: number
  skipped?: number
  total?: number
  error?: string
  /** Элементы обновленные на сервере после syncedSince (bidirectional sync) */
  serverItems?: TrackerServerItem[]
}

/** Прогресс просмотра с трекера */
export interface TrackerWatchProgressItem {
  animeId: string
  directoryCid?: string
  /** @deprecated TODO: удалить после миграции всех клиентов на directoryCid */
  manifestCid: string
  shikimoriId: number | null
  episodeNumber: number
  currentTime: number
  duration: number
  completed: boolean
  updatedAt: string
}

/** Профиль пользователя с трекера */
export interface TrackerUserProfile {
  name: string | null
  image: string | null
  customGateway: string | null
  preferredTrackMode: string | null
}

/** Результат добавления в библиотеку */
export interface TrackerAddToLibraryResult {
  success: boolean
  data?: TrackerLibraryItem
  error?: string
}

// ============================================================================
// Пакетная публикация
// ============================================================================

/** Элемент для пакетной публикации */
export interface TrackerBatchItem {
  animeId: string
  directoryCid: string
  animeName: string
}

/** Прогресс пакетной публикации (IPC event tracker:batchProgress) */
export interface TrackerBatchProgress {
  /** Текущий индекс (0-based) */
  current: number
  /** Общее количество */
  total: number
  /** Название текущего аниме */
  currentAnimeName: string
  /** DirectoryCid текущего аниме */
  currentDirectoryCid: string
  /** Результат для текущего (после завершения) */
  result?: TrackerPublishResult
}

/** Результат пакетной публикации */
export interface TrackerBatchResult {
  /** Общее количество */
  total: number
  /** Количество успешных */
  successCount: number
  /** Количество ошибок */
  errorCount: number
  /** Количество пропущенных (при отмене) */
  cancelledCount: number
  /** Детали по каждому аниме */
  results: Array<{
    directoryCid: string
    animeName: string
    result: TrackerPublishResult
  }>
}
