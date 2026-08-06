/**
 * Типы для Electron API, доступного через preload script
 * Должны совпадать с API в main/preload/index.ts
 */

import type {
  AudioTranscodeOptions,
  AudioTranscodeResult,
  AudioTranscodeVBROptions,
  DemuxOptions,
  DemuxResult,
  EncodingProfileOptions,
  FileFilter,
  MediaInfo,
  MergeConfig,
  OperationResult,
  PerFileTranscodeSettings,
  QueueItem,
  QueueItemStatus,
  SampleResult,
  SubtitleType,
  TranscodeProgress,
  TranscodeProgressExtended,
  VideoTranscodeOptions,
} from '../../../shared/types'
import type {
  AchievementUnlockedEvent,
  AchievementWithProgress,
  UserAchievements,
} from '../../../shared/types/achievements'
import type { ReencodePreview, ReencodeProgress, ReencodeResult } from '../../../shared/types/audio-reencode'
import type { BonusPoints, BonusTransaction } from '../../../shared/types/bonus-points'
import type { NamingPattern, SeasonType } from '../../../shared/types/export'
import type {
  ExportQueueResult,
  ExportQueueSettings,
  ExportTask,
  ExportTaskCreateData,
  QueueExportConfig,
} from '../../../shared/types/export-queue'
import type {
  AddTrackerOptions,
  DiscoverResult,
  FederationOperationResult,
  FederationSettings,
  GlobalSeederStats,
  SyncOptions,
  SyncResult,
  TrackerInfo,
  TrustLevel,
} from '../../../shared/types/federation'
import type {
  ImportHistoryCreateData,
  ImportHistoryEntry,
  ImportHistoryFilter,
  ImportHistoryStats,
} from '../../../shared/types/import-history'
import type {
  ImportQueueAddData,
  ImportQueueDetailProgress,
  ImportQueueEntry,
  ImportQueueState,
  ImportQueueStatus,
  ImportQueueVmafProgress,
  ImportQueueVmafResult,
} from '../../../shared/types/import-queue'
import type {
  ImportTemplate,
  ImportTemplateCreateData,
  ImportTemplateUpdateData,
} from '../../../shared/types/import-template'
import type {
  IpfsAddResult,
  IpfsServiceStatus,
  IpfsStatResult,
  IpnsPublishResult,
  IpnsResolveResult,
  KuboMode,
  KuboServiceStatus,
  P2PDiagnostics,
  PinInfo,
  PinStats,
  PublishedLibrary,
  PublisherConfig,
  PublishProgress,
  PublishResult,
  SchedulerConfig,
  SchedulerStatus,
  Subscription,
  SubscriptionCreateData,
  SubscriptionRefreshResult,
} from '../../../shared/types/ipfs'
import type {
  Friend,
  FriendRequest,
  PresenceMessage,
  PresenceSettings,
  UserProfile,
  UserProfileUpdate,
  WatchingInfo,
  WatchPartyChatMessage,
  WatchPartyInvite,
  WatchPartyParticipant,
  WatchPartyPlaybackState,
  WatchPartyRoom,
} from '../../../shared/types/orbitdb'
import type { AggregatedProgress, BatchImportItem, ImportQueueItem } from '../../../shared/types/parallel-transcode'
import type {
  PinataConfig,
  PinataPinJob,
  PinataStats,
  RemotePin,
  RemotePinConfig,
  RemotePinOptions,
} from '../../../shared/types/remote-pinning'
import type { RankChangedEvent, UserReputation } from '../../../shared/types/reputation'
import type { DailyStats, StatsUpdatedEvent, UserStats } from '../../../shared/types/stats'
import type {
  TrackerAddToLibraryResult,
  TrackerAnimeDetailResult,
  TrackerBatchItem,
  TrackerBatchProgress,
  TrackerBatchResult,
  TrackerCatalogResult,
  TrackerConfig,
  TrackerConnectionResult,
  TrackerLibraryItem,
  TrackerSyncResult,
  TrackerUserProfile,
} from '../../../shared/types/tracker'
import type {
  CqSearchOptions,
  CqSearchProgress,
  CqSearchResult,
  VmafOptions,
  VmafResult,
} from '../../../shared/types/vmaf'
import type { WebExportOptions, WebExportProgress, WebExportResult } from '../../../shared/types/web-player'

export type { NamingPattern, SeasonType }

/** Информация об IP адресе */
export interface IpInfo {
  ip: string
  type: 'lan' | 'vpn' | 'other'
  interface: string
}

/** Статус мобильного сервера */
export interface MobileServerStatus {
  /** Запущен ли сервер */
  isRunning: boolean
  /** Порт сервера */
  port: number | null
  /** Локальный IP адрес (предпочтительный) */
  localIp: string | null
  /** Все доступные IP адреса */
  allIps: IpInfo[]
  /** Полный URL для доступа (по предпочтительному IP) */
  url: string | null
  /** Количество обработанных запросов */
  requestCount: number
}

/** Информация о медиафайле */
export interface MediaFileInfo {
  path: string
  name: string
  size: number
  extension: string
}

/** Тип субтитров — реэкспорт единого источника (`shared/utils/subtitle-type`) */
export type { SubtitleType }

/** Результат матчинга внешнего субтитра */
export interface ExternalSubtitleMatch {
  /** Путь к файлу субтитров */
  filePath: string
  /** Код языка (ru, en, ja, und) */
  language: string
  /** Название дорожки */
  title: string
  /** Формат (ass, srt, vtt, ssa) */
  format: 'ass' | 'srt' | 'vtt' | 'ssa'
  /** Номер эпизода (null если не удалось определить) */
  episodeNumber: number | null
  /** Имена шрифтов из ASS файла */
  fontNames: string[]
  /** Найденные файлы шрифтов */
  matchedFonts: Array<{
    name: string
    path: string
  }>
  /** Название группы субтитров (из квадратных скобок в имени папки) */
  groupName?: string
  /** Тип субтитров (полные, надписи, песни) */
  subtitleType: SubtitleType
}

/** Результат сканирования внешних субтитров */
export interface ExternalSubtitleScanResult {
  /** Найденные папки субтитров */
  subsDirs: string[]
  /** Найденные папки шрифтов */
  fontsDirs: string[]
  /** Сматченные субтитры */
  subtitles: ExternalSubtitleMatch[]
  /** Несматченные файлы (для warning в UI) */
  unmatchedFiles: string[]
}

/** Результат матчинга внешнего аудио */
export interface ExternalAudioMatch {
  /** Путь к файлу аудио */
  filePath: string
  /** Номер эпизода (null если не удалось определить) */
  episodeNumber: number | null
  /** Код языка (ru, en, ja, und) */
  language: string
  /** Название дорожки */
  title: string
  /** Название папки-группы (озвучки) */
  groupName: string
  /** Кодек (aac, opus, flac и т.д.) */
  codec: string
  /** Количество каналов (2, 6, 8) */
  channels: number
  /** Битрейт в bps */
  bitrate: number
}

/** Результат сканирования внешних аудио */
export interface ExternalAudioScanResult {
  /** Найденные папки аудио */
  audioDirs: string[]
  /** Сматченные аудиофайлы */
  audioTracks: ExternalAudioMatch[]
  /** Несматченные файлы (для warning в UI) */
  unmatchedFiles: string[]
}

/** Данные эпизода для экспорта */
export interface EpisodeExportData {
  /** ID эпизода */
  id: string
  /** Номер эпизода */
  number: number
  /** Номер сезона */
  seasonNumber: number
  /** Название эпизода */
  name?: string | null
  /** CID транскодированного видео в IPFS */
  videoCid: string
  /** Аудиодорожки */
  audioTracks: Array<{
    language: string
    title: string | null
    transcodedCid: string | null
    streamIndex: number
  }>
  /** Субтитры */
  subtitleTracks: Array<{
    language: string
    title: string | null
    fileCid: string | null
    fonts: Array<{ fontName: string; fileCid: string | null }>
  }>
  /** Главы */
  chapters: Array<{
    startMs: number
    endMs: number
    title: string | null
    type: string
  }>
}

/** Конфигурация экспорта сериала */
export interface ExportSeriesConfig {
  /** Название аниме */
  animeName: string
  /** Год */
  year?: number
  /** Путь к папке назначения */
  outputDir: string
  /** Паттерн именования */
  namingPattern: NamingPattern
  /** Путь к постеру (опционально) */
  posterPath?: string
  /** Данные эпизодов */
  episodes: EpisodeExportData[]
  /** Выбранные ключи аудиодорожек (language + title) в порядке, указанном пользователем */
  selectedAudioKeys: string[]
  /** Выбранные ключи субтитров (language + title) в порядке, указанном пользователем */
  selectedSubtitleKeys: string[]
  /** Индекс аудиодорожки по умолчанию (0-based среди selectedAudioKeys) */
  defaultAudioIndex?: number
  /** Индекс субтитров по умолчанию (0-based среди selectedSubtitleKeys), undefined = нет default */
  defaultSubtitleIndex?: number
  /** Франшиза (для структуры папок) */
  franchise?: string
  /** Тип сезона (для умных паттернов) */
  seasonType?: SeasonType
  /** Создавать структуру папок */
  createFolderStructure?: boolean
  /** Открыть папку после экспорта */
  openFolderAfterExport?: boolean
}

/** Опции для определения пути в библиотеке */
export interface LibraryPathOptions {
  /** Путь к библиотеке */
  libraryPath: string
  /** Название аниме */
  animeName: string
  /** Номер сезона */
  seasonNumber: number
  /** Номер эпизода */
  episodeNumber: number
}

/** Статус аниме на Shikimori */
export type ShikimoriAnimeStatus = 'anons' | 'ongoing' | 'released'

/** Тип аниме на Shikimori */
export type ShikimoriAnimeKind = 'tv' | 'movie' | 'ova' | 'ona' | 'special' | 'music'

/** Тип жанра — genre (жанр) или theme (тема) */
export type ShikimoriGenreKind = 'genre' | 'theme'

/** Жанр или тема Shikimori */
export interface ShikimoriGenre {
  id: string
  name: string
  russian: string
  /** Тип: genre или theme */
  kind: ShikimoriGenreKind
}

/** Постер Shikimori */
export interface ShikimoriPoster {
  mainUrl: string
  originalUrl: string
}

/** Дата Shikimori */
export interface ShikimoriDate {
  year: number | null
  month: number | null
  day: number | null
}

/** Превью аниме (для списка поиска) */
export interface ShikimoriAnimePreview {
  id: string
  name: string
  russian: string | null
  description: string | null
  descriptionHtml: string | null
  score: number | null
  status: ShikimoriAnimeStatus
  kind: ShikimoriAnimeKind | null
  episodes: number
  episodesAired: number
  airedOn: ShikimoriDate | null
  releasedOn: ShikimoriDate | null
  poster: ShikimoriPoster | null
  genres: ShikimoriGenre[]
}

/** Полная информация об аниме */
export interface ShikimoriAnimeDetails extends ShikimoriAnimePreview {
  english: string | null
  japanese: string | null
  synonyms: string[]
  rating: string | null
  duration: number | null
  /** Правообладатели (лицензиаты) */
  licensors: string[]
  /** Название лицензиата на русском */
  licenseNameRu: string | null
}

/** Студия анимации (v0.5.1) */
export interface ShikimoriStudio {
  id: string
  name: string
  imageUrl: string | null
}

/** Персона (сейю, режиссёр и т.д.) (v0.5.1) */
export interface ShikimoriPerson {
  id: string
  name: string
  russian: string | null
  poster: ShikimoriPoster | null
}

/** Роль персоны в аниме (v0.5.1) */
export interface ShikimoriPersonRole {
  id: string
  rolesRu: string[]
  rolesEn: string[]
  person: ShikimoriPerson
}

/** Персонаж (v0.5.1) */
export interface ShikimoriCharacter {
  id: string
  name: string
  russian: string | null
  poster: ShikimoriPoster | null
}

/** Роль персонажа в аниме (v0.5.1) */
export interface ShikimoriCharacterRole {
  id: string
  rolesRu: string[]
  rolesEn: string[]
  character: ShikimoriCharacter
}

/** Внешняя ссылка (v0.5.1) */
export interface ShikimoriExternalLink {
  id: string
  kind: string
  url: string
}

/** Видео (трейлер, опенинг, эндинг) — v0.5.3 */
export interface ShikimoriVideo {
  id: string
  url: string
  name: string | null
  kind: string | null
  playerUrl: string | null
  imageUrl: string | null
}

/** Статистика оценок (v0.5.1) */
export interface ShikimoriScoreStat {
  score: number
  count: number
}

/** Статистика статусов (v0.5.1) */
export interface ShikimoriStatusStat {
  status: string
  count: number
}

/** Расширенная информация об аниме (v0.5.1, v0.5.3 — videos) */
export interface ShikimoriAnimeExtended extends ShikimoriAnimeDetails {
  studios: ShikimoriStudio[]
  personRoles: ShikimoriPersonRole[]
  characterRoles: ShikimoriCharacterRole[]
  fandubbers: string[]
  fansubbers: string[]
  externalLinks: ShikimoriExternalLink[]
  videos: ShikimoriVideo[]
  nextEpisodeAt: string | null
  scoresStats: ShikimoriScoreStat[]
  statusesStats: ShikimoriStatusStat[]
}

/** Тип связи между аниме на Shikimori */
export type ShikimoriRelationKind =
  | 'sequel'
  | 'prequel'
  | 'side_story'
  | 'parent_story'
  | 'summary'
  | 'full_story'
  | 'spin_off'
  | 'adaptation'
  | 'character'
  | 'alternative_version'
  | 'alternative_setting'
  | 'other'

/** Связанное аниме из GraphQL API */
export interface ShikimoriRelatedAnime {
  id: string
  anime: ShikimoriAnimePreview | null
  manga: null
  relationKind: ShikimoriRelationKind
  relationText: string
}

/** Аниме с информацией о связях */
export interface ShikimoriAnimeWithRelated {
  id: string
  name: string
  russian: string | null
  poster: ShikimoriPoster | null
  kind: ShikimoriAnimeKind | null
  status: ShikimoriAnimeStatus
  episodes: number
  airedOn: ShikimoriDate | null
  score: number | null
  related: ShikimoriRelatedAnime[]
}

/** Данные о связанном аниме для сохранения в БД */
export interface RelatedAnimeData {
  shikimoriId: number
  relationKind: string
  name: string | null
  posterUrl: string | null
  year: number | null
  kind: string | null
}

// === Типы для REST API графа франшизы ===

/** Узел графа франшизы (аниме в франшизе) */
export interface ShikimoriFranchiseNode {
  /** ID аниме на Shikimori */
  id: number
  /** Timestamp даты выхода */
  date: number
  /** Название (русское если есть, иначе оригинальное) */
  name: string
  /** URL постера */
  image_url: string
  /** URL страницы аниме */
  url: string
  /** Год выхода */
  year: number | null
  /** Тип: tv, movie, ova, ona, special, music */
  kind: string
  /** Вес узла для визуализации */
  weight: number
}

/** Связь между узлами графа франшизы */
export interface ShikimoriFranchiseLink {
  /** ID связи */
  id: number
  /** ID исходного аниме */
  source_id: number
  /** ID целевого аниме */
  target_id: number
  /** Индекс в массиве nodes (для визуализации) */
  source: number
  /** Индекс в массиве nodes (для визуализации) */
  target: number
  /** Вес связи для визуализации */
  weight: number
  /** Тип связи: sequel, prequel, side_story, etc. */
  relation: ShikimoriRelationKind
}

/** Ответ REST API /api/animes/{id}/franchise */
export interface ShikimoriFranchiseGraph {
  /** Все аниме в франшизе */
  nodes: ShikimoriFranchiseNode[]
  /** Связи между аниме */
  links: ShikimoriFranchiseLink[]
  /** ID текущего аниме (для которого запрошен граф) */
  current_id: number
}

/** Результат получения графа франшизы */
export interface FranchiseGraphResult {
  /** Полный граф франшизы */
  graph: ShikimoriFranchiseGraph
  /** Минимальный shikimoriId в графе (стабильный ключ франшизы) */
  rootShikimoriId: number
  /** Название франшизы (от root аниме) */
  franchiseName: string
}

/** Опции поиска Shikimori */
export interface ShikimoriSearchOptions {
  search: string
  limit?: number
  kind?: string
}

// === Manifest Types ===

/** Информация о видео в манифесте */
export interface ManifestVideo {
  path: string
  durationMs: number
  width: number
  height: number
  codec: string
  bitrate?: number
}

/** Аудиодорожка в манифесте */
export interface ManifestAudioTrack {
  id: string
  streamIndex: number
  language: string
  title: string
  codec: string
  channels: string
  bitrate?: number
  isDefault: boolean
  /** Группа озвучки (AniDUB, AniLibria и т.д.) */
  dubGroup?: string
}

/** Субтитры в манифесте */
export interface ManifestSubtitleTrack {
  id: string
  streamIndex: number
  language: string
  title: string
  format: string
  filePath: string
  isDefault: boolean
  fonts?: { name: string; path: string }[]
  /** Группа субтитров (HorribleSubs, FanSub Team и т.д.) */
  dubGroup?: string
}

/** Тип главы */
export type ManifestChapterType = 'chapter' | 'op' | 'ed' | 'recap' | 'preview'

/** Глава в манифесте */
export interface ManifestChapter {
  startMs: number
  endMs: number
  title: string | null
  type: ManifestChapterType
  skippable: boolean
}

/** Информация об эпизоде */
export interface ManifestInfo {
  animeName: string
  seasonNumber: number
  episodeNumber: number
  episodeName?: string
}

/** Переопределение дорожки (для передачи language/dubGroup из UI в манифест) */
export interface TrackOverride {
  /** Индекс потока (или -1 для внешних) */
  streamIndex: number
  /** Язык (ISO 639-1) */
  language?: string
  /** Группа озвучки/субтитров */
  dubGroup?: string
}

/** Превью кадры (sprite sheet) */
export interface ManifestThumbnails {
  vttCid: string
  spriteCid: string
}

/** Информация о кодировании */
export interface ManifestEncodingInfo {
  profileName: string
  codec: string
  cq: number
  preset: string
  rateControl: string
  tune?: string
  multipass?: string
  spatialAq?: boolean
  temporalAq?: boolean
  aqStrength?: number
  gopSize?: number
  lookahead?: number
  bRefMode?: string
  force10Bit?: boolean
  vmafScore?: number
  encoderType: 'gpu' | 'cpu'
  hardwareModel?: string
  ffmpegVersion?: string
  ffmpegCommand?: string
  transcodeDurationMs?: number
  activeGpuWorkers?: number
  videoMaxConcurrent?: number
  audioMaxConcurrent?: number
  sourceSize?: number
  transcodedSize?: number
  compressionRatio?: number
  sourceCodec?: string
  sourceWidth?: number
  sourceHeight?: number
  sourceBitrate?: number
  sourceBitDepth?: number
}

/** Полный манифест эпизода */
export interface EpisodeManifest {
  version: 1
  episodeId: string
  info: ManifestInfo
  video: ManifestVideo
  audioTracks: ManifestAudioTrack[]
  subtitleTracks: ManifestSubtitleTrack[]
  /** @deprecated Главы инлайн (для обратной совместимости) */
  chapters: ManifestChapter[]
  /** CID документа глав (ChaptersDocument) в IPFS */
  chaptersCid?: string
  /** @deprecated Превью инлайн (для обратной совместимости) */
  thumbnails?: ManifestThumbnails
  /** CID документа превью (ThumbnailsDocument) в IPFS */
  thumbnailsCid?: string
  navigation?: {
    nextEpisode?: { id: string; manifestPath: string }
    prevEpisode?: { id: string; manifestPath: string }
  }
  /** @deprecated Кодирование инлайн (для обратной совместимости) */
  encoding?: ManifestEncodingInfo
  /** CID документа кодирования (EncodingDocument) в IPFS */
  encodingCid?: string
  generatedAt: string
}

// === AnimeManifest Types ===

/** Параметры генерации AnimeManifest */
export interface GenerateAnimeManifestInput {
  /** ID аниме в БД */
  animeId: string
  /** Создавать манифесты эпизодов если их нет */
  createEpisodeManifests?: boolean
  /** PeerId создателя (из IPFS) */
  creatorPeerId?: string
}

/** Результат генерации AnimeManifest */
export interface GenerateAnimeManifestResult {
  success: boolean
  /** CID манифеста в IPFS */
  manifestCid?: string
  /** Сгенерированный манифест */
  manifest?: AnimeManifest
  /** Сообщение об ошибке */
  error?: string
}

/** Ссылка на эпизод в AnimeManifest */
export interface AnimeManifestEpisode {
  number: number
  season?: number
  name?: string
  manifestCid: string
  videoCid?: string
  size: number
  durationMs?: number
}

/** Жанр/Тема в AnimeManifest */
export interface AnimeManifestGenre {
  name: string
  nameRu?: string
}

/** Студия в AnimeManifest */
export interface AnimeManifestStudio {
  /** Shikimori ID студии */
  id?: number
  name: string
  /** URL логотипа (legacy, внешняя ссылка) */
  imageUrl?: string
  /** CID логотипа в IPFS */
  imageCid?: string
}

/** Персона в AnimeManifest */
export interface AnimeManifestPerson {
  /** Shikimori ID персоны */
  id?: number
  name: string
  nameRu?: string
  role: string
  /** URL изображения (legacy, внешняя ссылка) */
  imageUrl?: string
  /** CID изображения в IPFS */
  imageCid?: string
}

/** Персонаж в AnimeManifest */
export interface AnimeManifestCharacter {
  /** Shikimori ID персонажа */
  id?: number
  name: string
  nameRu?: string
  role?: string
  /** URL изображения (legacy, внешняя ссылка) */
  imageUrl?: string
  /** CID изображения в IPFS */
  imageCid?: string
  voiceActor?: {
    id?: number
    name: string
    nameRu?: string
  }
}

/** Внешние ID */
export interface AnimeManifestExternalIds {
  mal?: number
  anilist?: number
  shikimori?: number
  anidb?: number
}

/** Внешняя ссылка */
export interface AnimeManifestExternalLink {
  kind: string
  url: string
}

/** Видео материал */
export interface AnimeManifestVideo {
  kind: string
  name?: string
  url: string
  imageUrl?: string
}

/** AnimeManifest — Данные раздачи аниме для IPFS */
export interface AnimeManifest {
  version: 1
  /** CID AnimeInfo в IPFS (метаданные аниме) */
  animeInfoCid: string
  /** Название (для поиска и отображения) */
  name: string
  /** CID EpisodesDocument в IPFS (список эпизодов) */
  episodesCid: string
  /** CID постера в IPFS */
  posterCid?: string
  /** CID FranchiseGraphDocument в IPFS (полный граф франшизы) */
  franchiseGraphCid?: string
  /** CID RelationsDocument в IPFS (связи с другими аниме) */
  relationsCid?: string
  /** BDRemux / Bluray Remux */
  isBdRemux?: boolean
  /** PeerId создателя */
  creatorPeerId?: string
  createdAt: string
  updatedAt: string
}

/** Документ графа франшизы в IPFS */
export interface FranchiseGraphDocument {
  version: 1
  rootShikimoriId: number
  name: string
  nodes: FranchiseGraphNode[]
  links: FranchiseGraphLink[]
}

/** Узел графа франшизы */
export interface FranchiseGraphNode {
  id: number
  name: string
  kind: string
  year: number | null
  image_url: string
  url: string
  weight: number
}

/** Связь в графе франшизы */
export interface FranchiseGraphLink {
  source_id: number
  target_id: number
  relation: string
  weight: number
}

/** Документ связей аниме в IPFS */
export interface RelationsDocument {
  version: 1
  relations: AnimeManifestRelation[]
}

/** Связь с другим аниме */
export interface AnimeManifestRelation {
  targetShikimoriId: number
  relationKind: string
  targetName?: string
  targetYear?: number
  targetKind?: string
  targetPosterUrl?: string
}

// === AnimeInfo Types (каноничные неизменяемые метаданные) ===

/** Каноничный документ с метаданными аниме */
export interface AnimeInfo {
  version: 1
  name: string
  originalName?: string
  nameEn?: string
  synonyms?: string[]
  year?: number
  kind?: string
  ageRating?: string
  duration?: number
  source?: string
  episodeCount?: number
  status?: string
  rating?: number
  licensor?: string
  nextEpisodeAt?: string
  description?: string
  genres?: AnimeManifestGenre[]
  themes?: AnimeManifestGenre[]
  studios?: AnimeManifestStudio[]
  staff?: AnimeManifestPerson[]
  characters?: AnimeManifestCharacter[]
  fandubbers?: string[]
  fansubbers?: string[]
  externalIds: AnimeManifestExternalIds
  externalLinks?: AnimeManifestExternalLink[]
  videos?: AnimeManifestVideo[]
}

/** Результат генерации AnimeInfo */
export interface GenerateAnimeInfoResult {
  success: boolean
  animeInfoCid?: string
  animeInfo?: AnimeInfo
  error?: string
}

/** Информация о диске */
export interface DiskInfo {
  total: number
  free: number
  used: number
  usedPercent: number
}

/** Настройки системного трея */
export interface TraySettings {
  /** Сворачивать в трей при минимизации окна */
  minimizeToTray: boolean
  /** Закрывать в трей при нажатии на крестик */
  closeToTray: boolean
  /** Показывать уведомление при первом сворачивании в трей */
  showTrayNotification: boolean
}

/** Статус автообновления */
export interface UpdateStatus {
  /** Текущий статус */
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  /** Информация о доступном обновлении */
  updateInfo: {
    version: string
    releaseDate: string
    releaseNotes?: string
  } | null
  /** Прогресс загрузки (0-100) */
  downloadProgress: number
  /** Сообщение об ошибке */
  error: string | null
  /** Скорость загрузки (bytes/s) */
  downloadSpeed: number
  /** Оставшееся время загрузки (секунды) */
  downloadEta: number
}

// === Screenshot Types ===

/** Опции для генерации скриншотов */
export interface ScreenshotOptions {
  /** Количество скриншотов */
  count: number
  /** Формат изображения */
  format: 'webp' | 'jpg' | 'png'
  /** Ширина thumbnail (по умолчанию 320) */
  thumbnailWidth?: number
  /** Ширина полноразмерного (по умолчанию 1280) */
  fullWidth?: number
  /** Качество (по умолчанию 80) */
  quality?: number
  /** Пропустить первые N% видео (по умолчанию 10%) */
  skipStartPercent?: number
}

/** Прогресс миграции библиотеки на новый диск */
export interface MigrationProgress {
  phase: 'stopping-kubo' | 'copying' | 'updating-settings' | 'starting-kubo' | 'done' | 'error'
  progress: number
  currentFile?: string
  totalFiles?: number
  error?: string
}

/** Результат генерации скриншотов */
export interface ScreenshotResult {
  success: boolean
  /** Пути к thumbnail-ам (маленькие) */
  thumbnails: string[]
  /** Пути к полноразмерным скриншотам */
  fullSize: string[]
  error?: string
}

// === Рутрекер: результат парсинга раздачи ===

/** Информация о озвучке/субтитрах (Рутрекер) */
export interface RutrackerDubGroup {
  name: string
  type: 'dub' | 'sub'
  language: string
  isExternal: boolean
  details?: string
}

/** Аудиодорожка из MediaInfo (Рутрекер) */
export interface RutrackerAudioTrack {
  codec: string
  channels: string
  language: string
  bitrate: number
}

/** Техническая информация из MediaInfo (Рутрекер) */
export interface RutrackerMediaInfo {
  videoCodec: string
  bitDepth: number
  width: number
  height: number
  fps: number
  videoBitrate: number
  audioTracks: RutrackerAudioTrack[]
}

/** Внешние ссылки из тела поста раздачи */
export interface RutrackerExternalLinks {
  shikimoriUrl?: string
  shikimoriId?: number
  anidbUrl?: string
  worldArtUrl?: string
  malUrl?: string
  malId?: number
}

/** Результат парсинга страницы раздачи Рутрекера */
export interface RutrackerTorrentInfo {
  url: string
  topicId: number
  nameRu: string
  nameOriginal: string
  type?: string
  episodeInfo?: string
  episodeCount?: number
  languages: string[]
  year?: number
  genres: string[]
  sourceType?: string
  resolution?: string
  country?: string
  duration?: string
  director?: string
  studio?: string
  description?: string
  quality?: string
  releaseGroup?: string
  releaseType?: string
  dubGroups: RutrackerDubGroup[]
  mediaInfo?: RutrackerMediaInfo
  externalLinks: RutrackerExternalLinks
  magnetLink: string
  posterUrl?: string
  sizeText?: string
  fileList?: string[]
}

/** Результат матчинга раздачи с конкретным аниме на Shikimori */
export interface RutrackerMatchResult {
  shikimoriId: number
  /** Уровень уверенности (0..1) */
  confidence: number
  method: 'direct-link' | 'mal-link' | 'search-title'
  details: string
}

/** Скор одного кандидата при неуверенном матчинге */
export interface RutrackerCandidateScore {
  shikimoriId: number
  /** Итоговый скор (0..1) */
  score: number
  breakdown: {
    titleScore: number
    yearScore: number
    typeScore: number
    episodeScore: number
  }
}

/** Результат парсинга + матчинга раздачи с Shikimori */
export interface RutrackerImportResult {
  torrent: RutrackerTorrentInfo
  match: RutrackerMatchResult | null
  /** Нужно ли подтверждение пользователя */
  needsConfirmation: boolean
  /** Кандидаты для ручного выбора (если нет уверенного матча) */
  candidates: RutrackerCandidateScore[]
  /** Данные Shikimori (если матч найден и подтверждён) */
  shikimoriData?: ShikimoriAnimeExtended
}

// === Торрент-клиент (qBittorrent) ===

/** Статус торрента */
export type TorrentStatus = 'adding' | 'downloading' | 'checking' | 'seeding' | 'paused' | 'error' | 'done'

/** Файл в торренте */
export interface TorrentFileInfo {
  name: string
  path: string
  size: number
  /** Прогресс 0..1 */
  progress: number
}

/** Информация о торренте для renderer */
export interface TorrentInfo {
  /** Уникальный ID (infoHash) */
  infoHash: string
  name: string
  totalSize: number
  downloaded: number
  uploaded: number
  /** Прогресс 0..1 */
  progress: number
  downloadSpeed: number
  uploadSpeed: number
  numPeers: number
  ratio: number
  status: TorrentStatus
  /** Путь к папке с файлами */
  path: string
  addedAt: number
  magnetURI: string
  files: TorrentFileInfo[]
  /** Статус импорта: none (не импортирован), queued (в очереди), imported (в библиотеке) */
  importStatus?: 'none' | 'queued' | 'imported'
  animeName?: string
  shikimoriId?: number
  rutrackerUrl?: string
  /** Набор из нескольких аниме в одной раздаче */
  isBundle?: boolean
  /** JSON [{shikimoriId, animeName}] — аниме в наборе */
  bundleAnimesJson?: string
  error?: string
  /** Категория в qBittorrent ('animatrona' — добавлен через Animatrona, иначе/пусто — вручную) */
  category?: string
}

/** Компактный прогресс торрента — приходит каждые 2 сек через IPC (без files[]) */
export interface TorrentProgress {
  infoHash: string
  progress: number
  downloadSpeed: number
  uploadSpeed: number
  numPeers: number
  downloaded: number
  uploaded: number
  ratio: number
  status: TorrentStatus
}

/** Опции добавления торрента */
export interface AddTorrentOptions {
  downloadPath: string
  /** Последовательная загрузка (для стриминга) */
  sequential?: boolean
  /** Целевой ratio для авто-остановки сидирования */
  targetRatio?: number
  isBundle?: boolean
  bundleAnimesJson?: string
}

/** Данные для запуска скачивания раздачи Рутрекера */
export interface StartDownloadParams {
  /** Результат парсинга и матчинга */
  importResult: RutrackerImportResult
  /** Данные Shikimori (уже подтверждённые) */
  shikimoriData: ShikimoriAnimeExtended
  downloadPath?: string
  profileId?: string
  sequential?: boolean
  isBundle?: boolean
  bundleAnimesJson?: string
}

/** Результат запуска скачивания */
export interface StartDownloadResult {
  infoHash: string
  torrent: TorrentInfo
}

export interface ElectronAPI {
  // === Информация о приложении ===
  app: {
    /** Получить версию приложения */
    getVersion: () => Promise<string>
    /** Открыть URL во внешнем браузере */
    openExternal: (url: string) => Promise<void>
    /** Показать файл/папку в проводнике */
    showInFolder: (fullPath: string) => Promise<void>
    /** Получить системный путь */
    getPath: (name: string) => Promise<string>
    /** Получить количество ядер CPU */
    getCpuCount: () => Promise<number>
    /** Получить информацию о диске */
    getDiskInfo: (targetPath?: string) => Promise<DiskInfo | null>
    /** Получить размер папки библиотеки (с кешированием, TTL 5 минут) */
    getLibrarySize: (libraryPath: string, forceRefresh?: boolean) => Promise<number>
    /** Инвалидировать кеш размера библиотеки (вызывать после импорта) */
    invalidateLibrarySizeCache: () => Promise<boolean>
    /** Показать системное уведомление */
    showNotification: (options: {
      title: string
      body: string
      type?: 'info' | 'success' | 'error'
    }) => Promise<boolean>
    /** Получить состояние блокировки сна */
    getPowerSaveState: () => Promise<{
      isBlocking: boolean
      autoEnabled: boolean
      manualEnabled: boolean
    }>
    /** Переключить ручную блокировку сна */
    togglePowerSaveManual: () => Promise<{
      isBlocking: boolean
      manualEnabled: boolean
    }>
    /** Установить авто-блокировку при транскодировании */
    setPowerSaveAuto: (enabled: boolean) => Promise<{ autoEnabled: boolean }>
    /** Установить блокировку сна при воспроизведении видео */
    setPowerSavePlayback: (isPlaying: boolean) => Promise<{ isBlocking: boolean }>
    /** Проверить нужен ли setup wizard (первый запуск без libraryPath) */
    getSetupStatus: () => Promise<{ needsSetup: boolean; defaultLibraryPath: string }>
    /** Завершить setup wizard — сохранить libraryPath и запустить Kubo */
    completeSetup: (libraryPath: string) => Promise<void>
    /** Запустить миграцию библиотеки на новый диск */
    startLibraryMigration: (opts: { toPath: string; mode: 'copy' | 'move' }) => Promise<{ started: boolean }>
    /** Подписка на прогресс миграции библиотеки */
    onMigrationProgress: (callback: (progress: MigrationProgress) => void) => () => void
  }

  // === Управление окном (frameless title bar) ===
  window: {
    /** Минимизировать окно */
    minimize: () => Promise<void>
    /** Максимизировать / Восстановить окно */
    maximize: () => Promise<boolean>
    /** Закрыть окно */
    close: () => Promise<void>
    /** Проверить, максимизировано ли окно */
    isMaximized: () => Promise<boolean>
    /** Получить платформу (для позиционирования кнопок) */
    getPlatform: () => Promise<'win32' | 'darwin' | 'linux'>
    /** Подписка на изменение состояния maximize */
    onMaximizeChanged: (callback: (isMaximized: boolean) => void) => () => void
  }

  // === Диалоги ===
  dialog: {
    /** Открыть диалог выбора файла */
    selectFile: (filters?: FileFilter[]) => Promise<string | null>
    /** Открыть диалог выбора нескольких файлов */
    selectFiles: (filters?: FileFilter[]) => Promise<string[]>
    /** Открыть диалог выбора папки */
    selectFolder: () => Promise<string | null>
    /** Открыть диалог сохранения файла */
    saveFile: (defaultName?: string, filters?: FileFilter[]) => Promise<string | null>
  }

  // === Файловая система ===
  fs: {
    /**
     * Получить путь к файлу из File объекта (для Drag & Drop)
     * В Electron с contextIsolation: true свойство file.path недоступно,
     * поэтому используем webUtils.getPathForFile()
     */
    getPathForFile: (file: File) => string
    /** Сканировать папку на медиафайлы (video, audio или оба) */
    scanFolder: (
      folderPath: string,
      recursive?: boolean,
      mediaTypes?: ('video' | 'audio')[],
    ) => Promise<{ success: boolean; files: MediaFileInfo[] }>
    /** Удалить файл или папку (по умолчанию в корзину) */
    delete: (targetPath: string, moveToTrash?: boolean) => Promise<{ success: boolean; error?: string }>
    /** Проверить существование пути */
    exists: (targetPath: string) => Promise<boolean>
    /** Получить информацию о файле (размер, дата модификации) */
    stat: (filePath: string) => Promise<{ size?: number; mtime?: Date; error?: string }>
    /** Копировать файл (создаёт родительские директории автоматически) */
    copyFile: (sourcePath: string, destPath: string) => Promise<{ success: boolean; error?: string }>
    /** Сканировать внешние субтитры (Rus Sub/, Eng Sub/ и т.д.) */
    scanExternalSubtitles: (
      videoFolderPath: string,
      videoFiles: Array<{ path: string; episodeNumber: number }>,
    ) => Promise<ExternalSubtitleScanResult>
    /** Сканировать внешние аудио (Rus Sound/, Audio/ и т.д.) */
    scanExternalAudio: (
      videoFolderPath: string,
      videoFiles: Array<{ path: string; episodeNumber: number }>,
    ) => Promise<ExternalAudioScanResult>
    /** Получить метаданные изображения (размеры, blur placeholder) */
    getImageMetadata: (filePath: string) => Promise<{
      success: boolean
      width?: number
      height?: number
      size?: number
      mimeType?: string
      blurDataURL?: string
      error?: string
    }>
  }

  // === Субтитры ===
  subtitle: {
    /** Сдвинуть таймкоды в файле субтитров (ASS/SRT) */
    shift: (options: { inputPath: string; outputPath: string; offsetMs: number }) => Promise<{
      success: boolean
      removedEvents?: number
      totalEvents?: number
      error?: string
    }>
    /** Предпросмотр сдвига — первые N событий с новыми таймкодами */
    previewShift: (
      inputPath: string,
      offsetMs: number,
      limit?: number,
    ) => Promise<{
      events: Array<{ start: string; end: string; text: string }>
      total: number
      error?: string
    }>
  }

  // === Библиотека ===
  library: {
    /** Получить путь к библиотеке по умолчанию (Videos/Animatrona) */
    getDefaultPath: () => Promise<{ success: boolean; data?: string; error?: string }>
    /** Получить путь к папке эпизода */
    resolveOutputPath: (options: LibraryPathOptions) => Promise<{ success: boolean; data?: string; error?: string }>
    /** Создать структуру папок для эпизода */
    ensureEpisodeDirectory: (
      options: LibraryPathOptions,
    ) => Promise<{ success: boolean; data?: string; error?: string }>
    /** Создать папку для аниме (для постера и других общих файлов) */
    ensureAnimeDirectory: (
      libraryPath: string,
      animeName: string,
    ) => Promise<{ success: boolean; data?: string; error?: string }>
    /** Проверить, есть ли аниме с таким shikimoriId в библиотеке */
    checkAnimeExists: (shikimoriId: number) => Promise<{
      success: boolean
      data?: {
        exists: boolean
        animeId?: string
        animeName?: string
        episodeCount?: number
        needsReupload?: boolean
      }
      error?: string
    }>
    /** Синхронизировать эпизоды из IPFS (для онгоингов) */
    syncEpisodes: (animeId: string) => Promise<{
      success: boolean
      data?: { added: number; total: number }
      error?: string
    }>
  }

  // === Shikimori API ===
  shikimori: {
    /** Поиск аниме по названию */
    search: (options: ShikimoriSearchOptions) => Promise<{
      success: boolean
      data?: ShikimoriAnimePreview[]
      error?: string
    }>
    /** Получить детали аниме по Shikimori ID */
    getDetails: (shikimoriId: number) => Promise<{
      success: boolean
      data?: ShikimoriAnimeDetails
      error?: string
    }>
    /** Скачать постер и сохранить локально (в папку аниме если передан savePath) */
    downloadPoster: (
      posterUrl: string,
      animeId: string,
      options?: { fileName?: string; savePath?: string },
    ) => Promise<{
      success: boolean
      localPath?: string
      /** Имя файла */
      filename?: string
      /** MIME-тип */
      mimeType?: string
      /** Размер файла в байтах */
      size?: number
      /** Ширина изображения */
      width?: number
      /** Высота изображения */
      height?: number
      /** Base64 blur placeholder для next/image */
      blurDataURL?: string
      error?: string
    }>
    /** Получить аниме со связанными */
    getWithRelated: (shikimoriId: number) => Promise<{
      success: boolean
      data?: ShikimoriAnimeWithRelated
      error?: string
    }>
    /** Получить расширенные метаданные (v0.5.1) */
    getExtended: (shikimoriId: number) => Promise<{
      success: boolean
      data?: ShikimoriAnimeExtended
      error?: string
    }>
  }

  // === Франшизы ===
  franchise: {
    /** Получить связанные аниме из Shikimori (GraphQL) */
    fetchRelated: (shikimoriId: number) => Promise<{
      success: boolean
      data?: {
        sourceAnime: {
          shikimoriId: number
          name: string
          /** ID франшизы из Shikimori (например "tondemo_skill_de_isekai_hourou_meshi") */
          franchise: string | null
        }
        relatedAnimes: RelatedAnimeData[]
      }
      error?: string
    }>

    /** Получить граф франшизы из REST API Shikimori */
    fetchGraph: (shikimoriId: number) => Promise<{
      success: boolean
      data?: FranchiseGraphResult | null
      message?: string
      error?: string
    }>

    /** Очистить кэш графов франшиз */
    clearCache: () => Promise<{
      success: boolean
      error?: string
    }>
  }

  // === AnimeManifest (IPFS) ===
  animeManifest: {
    /** Генерировать манифест аниме и опубликовать в IPFS */
    generate: (input: GenerateAnimeManifestInput) => Promise<{
      success: boolean
      data?: GenerateAnimeManifestResult
      error?: string
    }>

    /** Обновить манифест аниме и сохранить CID в БД */
    update: (animeId: string) => Promise<{
      success: boolean
      data?: GenerateAnimeManifestResult
      error?: string
    }>

    /** Получить манифест из IPFS по CID */
    get: (manifestCid: string) => Promise<{
      success: boolean
      data?: AnimeManifest
      error?: string
    }>

    /** Получить манифест аниме по ID аниме (из IPFS или сгенерировать) */
    getByAnimeId: (animeId: string) => Promise<{
      success: boolean
      data?: AnimeManifest
      error?: string
    }>

    /** Batch-генерация манифестов для нескольких аниме */
    generateBatch: (animeIds: string[]) => Promise<{
      success: boolean
      data?: {
        success: number
        failed: number
        errors: Array<{ animeId: string; error: string }>
      }
      error?: string
    }>

    /** Получить список аниме без directoryCid */
    getAnimesWithoutManifest: () => Promise<{
      success: boolean
      data?: Array<{ id: string; name: string }>
      error?: string
    }>

    /** Импортировать аниме из IPFS (directoryCid или manifestCid) */
    import: (
      cid: string,
      pin?: boolean,
    ) => Promise<{
      success: boolean
      data?: { animeId: string; animeName: string; episodeCount: number }
      error?: string
    }>

    /** Получить список аниме без animeInfoCid */
    getAnimesWithoutAnimeInfo: () => Promise<{
      success: boolean
      data?: Array<{ id: string; name: string }>
      error?: string
    }>

    /** Регенерировать все манифесты. opts.resumeFrom — ISO timestamp старта прерванного запуска */
    regenerateAll: (opts?: { resumeFrom?: string }) => Promise<{
      success: boolean
      data?: {
        success: number
        failed: number
        errors: Array<{ animeId: string; error: string }>
      }
      error?: string
    }>

    /** Остановить регенерацию (после текущего аниме, чекпоинт сохраняется) */
    stopRegeneration: () => Promise<{ success: boolean; data?: true; error?: string }>

    /** Получить чекпоинт прерванной регенерации (null если нет) */
    getRegenCheckpoint: () => Promise<{
      success: boolean
      data?: { startedAt: string; total: number; pending: number } | null
      error?: string
    }>

    /** Подписка на прогресс регенерации */
    onRegenerateProgress: (
      callback: (data: {
        current: number
        total: number
        animeName: string
        status: 'processing' | 'ok' | 'error'
        error?: string
      }) => void,
    ) => () => void

    /** Точечная регенерация EpisodeManifest + AnimeManifest + directoryCid для одного аниме */
    regenerateForAnime: (animeId: string) => Promise<{
      success: boolean
      data?: { updated: number; failed: number }
      error?: string
    }>

    /** Дедупликация дорожек (AudioTrack / SubtitleTrack) */
    deduplicateTracks: () => Promise<{
      success: boolean
      data?: { audioRemoved: number; subtitlesRemoved: number; fontsRemoved: number }
      error?: string
    }>

    /** Сводка по contentHealth — счётчики complete/degraded/broken/unknown */
    getHealthSummary: () => Promise<{
      success: boolean
      data?: { complete: number; degraded: number; broken: number; unknown: number }
      error?: string
    }>

    /** Получить текущее состояние регенерации (для восстановления UI после навигации) */
    getRegenerationStatus: () => Promise<{
      success: boolean
      data?: {
        isRegenerating: boolean
        startedAt: number | null
        finishedAt: number | null
        current: number
        total: number
        currentAnimeName: string | null
        log: Array<{
          id: string
          timestamp: number
          level: 'info' | 'warn' | 'error' | 'success'
          message: string
          meta?: Record<string, unknown>
        }>
        result: {
          success: number
          failed: number
          errors: Array<{ animeId: string; error: string }>
        } | null
      }
      error?: string
    }>

    /** Сбросить state регенерации */
    resetRegenerationState: () => Promise<{ success: boolean; error?: string }>

    /** Подписка на старт новой регенерации — renderer должен очистить старый лог */
    onRegenerateStarted: (callback: (data: { total: number }) => void) => () => void

    /** Подписка на live-события лога регенерации */
    onRegenerateLog: (
      callback: (entry: {
        id: string
        timestamp: number
        level: 'info' | 'warn' | 'error' | 'success'
        message: string
        meta?: Record<string, unknown>
      }) => void,
    ) => () => void

    /** Подписка на завершение регенерации */
    onRegenerateFinished: (
      callback: (data: { success: number; failed: number; stopped?: boolean; diskFull?: boolean }) => void,
    ) => () => void

    /** Список аниме с потерями для UI-отчёта */
    getDegradedAndBroken: () => Promise<{
      success: boolean
      data?: Array<{
        id: string
        name: string
        contentHealth: string | null
        missingCidsJson: string | null
        missingFontsJson: string | null
      }>
      error?: string
    }>
  }

  // === AnimeInfo (каноничные неизменяемые метаданные) ===
  animeInfo: {
    /** Получить AnimeInfo из IPFS по CID */
    get: (animeInfoCid: string) => Promise<{
      success: boolean
      data?: AnimeInfo
      error?: string
    }>

    /** Генерировать AnimeInfo для аниме */
    generate: (animeId: string) => Promise<{
      success: boolean
      data?: GenerateAnimeInfoResult
      error?: string
    }>
  }

  // === Manifest ===
  manifest: {
    /** Сгенерировать манифест из результатов demux */
    generate: (
      demuxResult: DemuxResult,
      options: {
        episodeId: string
        videoPath: string
        outputDir: string
        animeInfo: ManifestInfo
        /** Переопределения для аудиодорожек (язык, dubGroup из UI) */
        audioTrackOverrides?: TrackOverride[]
        /** Переопределения для субтитров (язык, dubGroup из UI) */
        subtitleTrackOverrides?: TrackOverride[]
      },
    ) => Promise<{
      success: boolean
      manifestPath?: string
      manifest?: EpisodeManifest
      error?: string
    }>
    /** Прочитать существующий манифест */
    read: (manifestPath: string) => Promise<{
      success: boolean
      data?: EpisodeManifest
      error?: string
    }>
    /** Обновить навигацию в манифесте */
    updateNavigation: (
      manifestPath: string,
      navigation: {
        nextEpisode?: { id: string; manifestPath: string }
        prevEpisode?: { id: string; manifestPath: string }
      },
    ) => Promise<{ success: boolean; error?: string }>
    /** Обновить thumbnails в манифесте (с CID для IPFS) */
    updateThumbnails: (
      manifestPath: string,
      thumbnails: {
        vttCid: string
        spriteCid: string
      },
    ) => Promise<{ success: boolean; error?: string }>
    /** Batch-обновление навигации между эпизодами через IPFS */
    updateNavigationBatch: (
      episodes: Array<{ id: string; manifestCid: string }>,
    ) => Promise<{ success: boolean; data?: Record<string, string>; error?: string }>
    /** Получить главы эпизода из IPFS манифеста */
    getChapters: (manifestCid: string) => Promise<{ success: boolean; data?: ManifestChapter[]; error?: string }>
    /** Обновить главы эпизода через IPFS */
    updateChapters: (
      episodeId: string,
      chapters: ManifestChapter[],
    ) => Promise<{ success: boolean; data?: string; error?: string }>
    /** Копировать главы из одного эпизода в другие */
    copyChapters: (
      sourceEpisodeId: string,
      targetEpisodeIds: string[],
      chapterTypes: string[],
    ) => Promise<{ success: boolean; data?: { count: number; skipped: number }; error?: string }>
    /** Генерация RECAP/PREVIEW глав */
    generateRecapPreview: (
      episodes: Array<{ id: string; manifestCid: string; durationMs: number }>,
    ) => Promise<{ success: boolean; data?: { created: number; skipped: number }; error?: string }>
    /** Обновить информацию о кодировании в манифесте */
    updateEncoding: (
      manifestPath: string,
      encoding: {
        profileName: string
        codec: string
        cq: number
        preset: string
        rateControl: string
        tune?: string
        multipass?: string
        spatialAq?: boolean
        temporalAq?: boolean
        aqStrength?: number
        gopSize?: number
        lookahead?: number
        bRefMode?: string
        force10Bit?: boolean
        vmafScore?: number
        encoderType: 'gpu' | 'cpu'
        hardwareModel?: string
        ffmpegVersion?: string
        ffmpegCommand?: string
        transcodeDurationMs?: number
        activeGpuWorkers?: number
        videoMaxConcurrent?: number
        audioMaxConcurrent?: number
        sourceSize?: number
        transcodedSize?: number
        compressionRatio?: number
        sourceCodec?: string
        sourceWidth?: number
        sourceHeight?: number
        sourceBitrate?: number
        sourceBitDepth?: number
      },
    ) => Promise<{ success: boolean; error?: string }>
    /** Обновить CID'ы медиафайлов в манифесте перед загрузкой в IPFS */
    updateMediaCids: (
      manifestPath: string,
      options: {
        videoCid?: string
        audioTrackCids?: Record<string, string>
        audioTrackCodecs?: Record<string, string>
        audioTrackChannels?: Record<string, string>
        subtitleTrackCids?: Record<string, string>
        fontCids?: Record<string, string>
        sizes?: Record<string, number>
        metadataCid?: string
      },
    ) => Promise<{ success: boolean; error?: string }>
    /** Получить информацию о кодировании из IPFS манифеста */
    getEncoding: (manifestCid: string) => Promise<{ success: boolean; data?: ManifestEncodingInfo; error?: string }>
    /** Получить thumbnails из IPFS манифеста */
    getThumbnails: (manifestCid: string) => Promise<{ success: boolean; data?: ManifestThumbnails; error?: string }>
    /** Полная перестройка аудио/субтитров в манифесте из БД (включая внешние дорожки) */
    rebuildTracksFromDb: (
      manifestPath: string,
      episodeId: string,
    ) => Promise<{ success: boolean; data?: { changed: boolean }; error?: string }>
  }

  // === FFmpeg ===
  ffmpeg: {
    /** Анализ медиафайла */
    probe: (filePath: string) => Promise<OperationResult & { data?: MediaInfo }>
    /** Транскодирование видео */
    transcodeVideo: (input: string, output: string, options: VideoTranscodeOptions) => Promise<OperationResult>
    /** Транскодирование аудио */
    transcodeAudio: (input: string, output: string, options: AudioTranscodeOptions) => Promise<OperationResult>
    /** Мерж в MKV */
    merge: (config: MergeConfig) => Promise<OperationResult & { outputPath?: string }>
    /** Демультиплексирование (извлечение потоков без перекодирования) */
    demux: (inputPath: string, outputDir: string, options?: DemuxOptions) => Promise<DemuxResult>
    /** Извлечение шрифтов из MKV attachments (extract + IPFS upload + cleanup) */
    extractFonts: (inputPath: string) => Promise<{
      fonts: Array<{ name: string; ext: string; fileName: string; cid: string | null; ipfsSize: number | null }>
    }>
    /** Извлечение одного потока по streamSpec (напр. "0:s:2") — без полного demux */
    extractStream: (
      inputPath: string,
      outputPath: string,
      streamSpec: string,
    ) => Promise<{ success: boolean; path: string; size: number }>
    /** Транскодирование аудио VBR (умный подбор битрейта) */
    transcodeAudioVBR: (
      input: string,
      output: string,
      options: AudioTranscodeVBROptions,
    ) => Promise<AudioTranscodeResult>
    /** Кодирование тестового сэмпла */
    encodeSample: (options: {
      inputPath: string
      outputPath: string
      profile: EncodingProfileOptions
      startTime?: number
      duration?: number
      sourceBitDepth?: number
    }) => Promise<SampleResult>
    /** Генерация скриншотов из видео */
    generateScreenshots: (
      inputPath: string,
      outputDir: string,
      duration: number,
      options: ScreenshotOptions,
    ) => Promise<ScreenshotResult>
    /** Генерация thumbnail sprite sheet для hover preview */
    generateThumbnailSprite: (
      inputPath: string,
      outputDir: string,
      duration: number,
      options?: {
        frameCount?: number
        frameWidth?: number
        frameHeight?: number
        columns?: number
        quality?: number
      },
    ) => Promise<{
      success: boolean
      spritePath: string
      vttPath: string
      spriteSize: number
      error?: string
    }>
    /** Подписка на прогресс генерации скриншотов */
    onScreenshotsProgress: (callback: (data: { current: number; total: number }) => void) => () => void
    /** Подписка на прогресс FFmpeg операций */
    onProgress: (callback: (data: TranscodeProgress & { type: string; profileName?: string }) => void) => () => void
    /** Убить все активные FFmpeg процессы */
    killAll: () => Promise<OperationResult & { data?: { killed: number } }>
    /** Получить версию FFmpeg */
    getVersion: () => Promise<OperationResult & { data?: string }>
    /** Получить информацию об оборудовании (GPU возможности + CPU) */
    getHardwareInfo: () => Promise<
      OperationResult & {
        data?: {
          gpuModel: string | null
          cpuModel: string
          generation: import('../../../shared/types').GpuGeneration
          supportsAv1: boolean
          supportsUhqTune: boolean
          supportsTemporalFilter: boolean
        }
      }
    >
  }

  // === VMAF автоподбор качества ===
  vmaf: {
    /** Расчёт VMAF между оригинальным и закодированным видео */
    calculate: (
      encoded: string,
      original: string,
      options?: VmafOptions,
    ) => Promise<{ success: boolean; data?: VmafResult; error?: string }>

    /** Поиск оптимального CQ для целевого VMAF */
    findOptimalCQ: (
      inputPath: string,
      videoOptions: Omit<VideoTranscodeOptions, 'cq'>,
      options?: Partial<CqSearchOptions>,
      preferCpu?: boolean,
      itemId?: string,
    ) => Promise<{ success: boolean; data?: CqSearchResult; error?: string }>

    /** Подписка на прогресс поиска CQ */
    onProgress: (callback: (progress: CqSearchProgress) => void) => () => void
  }

  // === Очередь транскодирования ===
  transcode: {
    /** Добавить файл в очередь */
    addToQueue: (
      filePath: string,
      settings?: PerFileTranscodeSettings,
    ) => Promise<{ success: boolean; id?: string; error?: string }>

    /** Удалить из очереди */
    removeFromQueue: (id: string) => Promise<{ success: boolean; error?: string }>

    /** Начать обработку очереди */
    start: () => Promise<{ success: boolean; error?: string }>

    /** Приостановить элемент */
    pauseItem: (id: string) => Promise<{ success: boolean; error?: string }>

    /** Возобновить элемент */
    resumeItem: (id: string) => Promise<{ success: boolean; error?: string }>

    /** Отменить элемент */
    cancelItem: (id: string) => Promise<{ success: boolean; error?: string }>

    /** Изменить порядок очереди */
    reorderQueue: (orderedIds: string[]) => Promise<{ success: boolean; error?: string }>

    /** Обновить настройки элемента */
    updateSettings: (id: string, settings: PerFileTranscodeSettings) => Promise<{ success: boolean; error?: string }>

    /** Получить текущую очередь */
    getQueue: () => Promise<{ success: boolean; queue: QueueItem[]; error?: string }>

    /** Получить элемент по ID */
    getItem: (id: string) => Promise<{ success: boolean; item?: QueueItem; error?: string }>

    /** Анализировать элемент */
    analyzeItem: (id: string, demuxResult: DemuxResult) => Promise<{ success: boolean; error?: string }>

    /** Проверить возможность паузы */
    getPauseCapabilities: () => Promise<{
      success: boolean
      available: boolean
      method: 'signals' | 'pssuspend' | 'none'
      message?: string
      error?: string
    }>

    /** Приостановить всю обработку */
    pauseAll: () => Promise<{ success: boolean; error?: string }>

    /** Возобновить всю обработку */
    resumeAll: () => Promise<{ success: boolean; error?: string }>

    /** Установить путь к библиотеке */
    setLibraryPath: (libraryPath: string) => Promise<{ success: boolean; error?: string }>

    /** Подписка на прогресс элемента */
    onProgress: (callback: (id: string, progress: TranscodeProgressExtended) => void) => () => void

    /** Подписка на изменение статуса */
    onStatusChange: (callback: (id: string, status: QueueItemStatus, error?: string) => void) => () => void

    /** Подписка на изменение очереди */
    onQueueChange: (callback: (queue: QueueItem[]) => void) => () => void

    /** Подписка на начало обработки */
    onProcessingStarted: (callback: () => void) => () => void

    /** Подписка на завершение обработки */
    onProcessingCompleted: (callback: () => void) => () => void
  }

  // === Параллельное транскодирование (Dual Encoders + CPU Audio) ===
  parallelTranscode: {
    /** Добавить batch эпизодов для обработки (legacy без batchId) */
    addBatch: (items: BatchImportItem[]) => Promise<{ success: boolean; error?: string }>

    /** Добавить batch эпизодов для обработки с batchId */
    addBatchWithId: (items: BatchImportItem[], batchId?: string) => Promise<{ success: boolean; error?: string }>

    /** Начать новый batch с полным сбросом состояния + лимиты конкурентности */
    startNewBatch: (
      items: BatchImportItem[],
      batchId?: string,
      concurrency?: { videoMaxConcurrent?: number; audioMaxConcurrent?: number },
    ) => Promise<{ success: boolean; error?: string }>

    /** Получить текущий batch ID */
    getCurrentBatchId: () => Promise<{ success: boolean; data?: string | null; error?: string }>

    /** Получить текущие лимиты параллельности */
    getConcurrencyLimits: () => Promise<{
      success: boolean
      data?: { videoMaxConcurrent: number; audioMaxConcurrent: number }
      error?: string
    }>

    /** Установить максимальное количество параллельных аудио-задач */
    setAudioMaxConcurrent: (value: number) => Promise<{ success: boolean; value?: number; error?: string }>

    /** Установить максимальное количество параллельных видео-задач */
    setVideoMaxConcurrent: (value: number) => Promise<{ success: boolean; value?: number; error?: string }>

    /** Добавить один элемент */
    addItem: (item: BatchImportItem) => Promise<{ success: boolean; error?: string }>

    /** Получить агрегированный прогресс */
    getProgress: () => Promise<{ success: boolean; progress: AggregatedProgress | null; error?: string }>

    /** Получить элемент по ID */
    getItem: (itemId: string) => Promise<{ success: boolean; item: ImportQueueItem | null; error?: string }>

    /** Получить все элементы */
    getItems: () => Promise<{ success: boolean; items: ImportQueueItem[]; error?: string }>

    /** Проверить, идёт ли обработка */
    isProcessing: () => Promise<{ success: boolean; processing: boolean; error?: string }>

    /** Приостановить всё */
    pause: () => Promise<{ success: boolean; error?: string }>

    /** Возобновить всё */
    resume: () => Promise<{ success: boolean; error?: string }>

    /** Отменить элемент */
    cancelItem: (itemId: string) => Promise<{ success: boolean; error?: string }>

    /** Отменить всё */
    cancelAll: () => Promise<{ success: boolean; error?: string }>

    /** Очистить завершённые (опционально только успешные — error/cancelled не трогаем) */
    clearCompleted: (options?: { onlySuccess?: boolean }) => Promise<{ success: boolean; error?: string }>

    // === Подписки на события ===

    /** Подписка на агрегированный прогресс */
    onAggregatedProgress: (callback: (progress: AggregatedProgress) => void) => () => void

    /** Подписка на прогресс видео */
    onVideoProgress: (callback: (taskId: string, progress: TranscodeProgressExtended) => void) => () => void

    /** Подписка на прогресс аудио */
    onAudioProgress: (callback: (taskId: string, progress: TranscodeProgressExtended) => void) => () => void

    /** Подписка на завершение видео */
    onVideoCompleted: (
      callback: (
        itemId: string,
        episodeId: string,
        outputPath: string,
        meta?: {
          ffmpegCommand?: string
          transcodeDurationMs?: number
          activeGpuWorkers?: number
        },
      ) => void,
    ) => () => void

    /** Подписка на завершение аудиодорожки */
    onAudioTrackCompleted: (
      callback: (
        trackId: string,
        outputPath: string,
        episodeId: string,
        passthrough?: boolean,
        originalCodec?: string,
      ) => void,
    ) => () => void

    /** Подписка на завершение элемента (видео + все аудио готовы) */
    onItemCompleted: (
      callback: (itemId: string, episodeId: string, success: boolean, errorMessage?: string) => void,
    ) => () => void

    /** Подписка на ошибку батча */
    onBatchError: (callback: (error: string) => void) => () => void

    /** Подписка на отмену всех задач */
    onAllCancelled: (callback: () => void) => () => void

    /** Подписка на добавление элемента */
    onItemAdded: (callback: (itemId: string, episodeId: string) => void) => () => void

    /** Подписка на ошибку элемента */
    onItemError: (callback: (itemId: string, episodeId: string, error: string) => void) => () => void

    /** Подписка на ошибку задачи */
    onTaskError: (callback: (taskId: string, type: 'video' | 'audio', error: string) => void) => () => void

    /** Подписка на паузу */
    onPaused: (callback: () => void) => () => void

    /** Подписка на возобновление */
    onResumed: (callback: () => void) => () => void

    /** Подписка на завершение batch */
    onBatchCompleted: (callback: (batchId: string, success: boolean) => void) => () => void

    // === VMAF прогресс (сохраняется в main для навигации) ===

    /** Получить VMAF прогресс для item */
    getVmafProgress: (itemId?: string) => Promise<{ success: boolean; data?: CqSearchProgress; error?: string }>

    /** Получить все VMAF прогрессы */
    getAllVmafProgress: () => Promise<{ success: boolean; data?: Record<string, CqSearchProgress>; error?: string }>

    /** Подписка на VMAF прогресс */
    onVmafProgress: (callback: (itemId: string, progress: CqSearchProgress) => void) => () => void

    // === Защита от дублирования обработки ===

    /** Проверить, обрабатывается ли item */
    isItemProcessing: (itemId?: string) => Promise<{ success: boolean; data?: boolean; error?: string }>

    /** Установить текущий обрабатываемый item */
    setProcessingItem: (itemId: string | null) => Promise<{ success: boolean; data?: boolean; error?: string }>

    /** Получить ID текущего обрабатываемого item */
    getProcessingItemId: () => Promise<{ success: boolean; data?: string | null; error?: string }>

    // === FFmpeg Log Viewer ===

    /** Получить все видео-логи */
    getVideoLogs: () => Promise<{
      success: boolean
      data?: Array<{ timestamp: number; taskId: string; level: 'info' | 'warning' | 'error'; message: string }>
      error?: string
    }>

    /** Получить логи конкретной видео-задачи */
    getVideoTaskLogs: (taskId: string) => Promise<{
      success: boolean
      data?: Array<{ timestamp: number; taskId: string; level: 'info' | 'warning' | 'error'; message: string }>
      error?: string
    }>

    /** Очистить все видео-логи */
    clearVideoLogs: () => Promise<{ success: boolean; error?: string }>

    /** Получить количество записей в видео-логах */
    getVideoLogCount: () => Promise<{ success: boolean; data?: number; error?: string }>

    /** Подписка на новые записи логов (real-time) */
    onVideoLogEntry: (
      callback: (
        taskId: string,
        entry: { timestamp: number; level: 'info' | 'warning' | 'error'; message: string },
      ) => void,
    ) => () => void
  }

  // === Системный трей ===
  tray: {
    /** Получить текущие настройки трея */
    getSettings: () => Promise<TraySettings>
    /** Обновить настройки трея */
    updateSettings: (settings: Partial<TraySettings>) => Promise<void>
    /** Подписка на изменение настроек трея из main process */
    onSettingsChanged: (callback: (settings: TraySettings) => void) => () => void
  }

  // === Import Queue — Event-driven архитектура ===
  importQueue: {
    // === Команды ===

    /** Добавить items в очередь */
    addItems: (items: ImportQueueAddData[]) => Promise<{ success: boolean; error?: string }>

    /** Начать обработку очереди */
    start: () => Promise<{ success: boolean; error?: string }>

    /** Приостановить очередь */
    pause: () => Promise<{ success: boolean; error?: string }>

    /** Возобновить очередь */
    resume: () => Promise<{ success: boolean; error?: string }>

    /** Отменить item */
    cancelItem: (itemId: string) => Promise<{ success: boolean; error?: string }>

    /** Удалить item из очереди */
    removeItem: (itemId: string) => Promise<{ success: boolean; error?: string }>

    /** Повторить обработку item с ошибкой */
    retryItem: (
      itemId: string,
      options?: { skipCompressionCheck?: boolean },
    ) => Promise<{ success: boolean; error?: string }>

    /** Пометить completed item как failed (для повторного импорта) */
    markItemFailed: (itemId: string) => Promise<{ success: boolean; error?: string }>

    /** Аудит завершённых items — найти неполные эпизоды */
    auditCompleted: () => Promise<{
      success: boolean
      data?: { checked: number; markedFailed: number }
      error?: string
    }>

    /** Переделать недостающие эпизоды (retranscode mode, опционально с pre-encode) */
    retryMissing: (
      itemId: string,
      preEncodeOptions?: { enabled: boolean; crf?: number; preset?: string },
    ) => Promise<{ success: boolean; data?: { newItemId?: string }; error?: string }>

    /** Отменить всю очередь */
    cancelAll: () => Promise<{ success: boolean; error?: string }>

    /** Получить текущее состояние очереди */
    getState: () => Promise<{ success: boolean; data?: ImportQueueState; error?: string }>

    /** Получить item по ID */
    getItem: (itemId: string) => Promise<{ success: boolean; data?: ImportQueueEntry; error?: string }>

    /** Очистить завершённые items (опционально только успешные — error/cancelled не трогаем) */
    clearCompleted: (options?: { onlySuccess?: boolean }) => Promise<{ success: boolean; error?: string }>

    /** Установить автозапуск */
    setAutoStart: (enabled: boolean) => Promise<{ success: boolean; error?: string }>

    /** Изменить порядок элементов (drag & drop) */
    reorderItems: (activeId: string, overId: string) => Promise<{ success: boolean; error?: string }>

    /** Обновить данные item (профиль, параллельность, sync offset и т.д.) */
    updateItem: (itemId: string, data: Partial<ImportQueueAddData>) => Promise<{ success: boolean; error?: string }>

    // === Обновления от renderer (ImportProcessor) ===

    /** Обновить статус item */
    updateStatus: (
      itemId: string,
      status: ImportQueueStatus,
      error?: string,
    ) => Promise<{ success: boolean; error?: string }>

    /** Обновить прогресс item */
    updateProgress: (
      itemId: string,
      progress: number,
      currentFileName?: string,
      currentStage?: string,
      detailProgress?: ImportQueueDetailProgress,
    ) => Promise<{ success: boolean; error?: string }>

    /** Обновить VMAF прогресс */
    updateVmafProgress: (
      itemId: string,
      vmafProgress: ImportQueueVmafProgress,
    ) => Promise<{ success: boolean; error?: string }>

    /** Установить результат VMAF */
    setVmafResult: (itemId: string, result: ImportQueueVmafResult) => Promise<{ success: boolean; error?: string }>

    /** Установить результат импорта (animeId) */
    setImportResult: (itemId: string, animeId: string) => Promise<{ success: boolean; error?: string }>

    // === Подписки на события (main → renderer) ===

    /** Подписка на изменение состояния очереди */
    onStateChanged: (callback: (state: ImportQueueState) => void) => () => void

    /** Подписка на изменение статуса item */
    onItemStatus: (
      callback: (data: { itemId: string; status: ImportQueueStatus; error?: string }) => void,
    ) => () => void

    /** Подписка на изменение прогресса item */
    onItemProgress: (
      callback: (data: {
        itemId: string
        progress: number
        currentFileName?: string
        currentStage?: string
        detailProgress?: ImportQueueDetailProgress
        vmafProgress?: ImportQueueVmafProgress
      }) => void,
    ) => () => void

    /** Подписка на инвалидацию кэша (main → renderer после завершения импорта в main process) */
    onCacheInvalidate: (callback: (queryKeys: string[]) => void) => () => void
  }

  // === Шаблоны импорта ===
  templates: {
    /** Получить все шаблоны (дефолтные + пользовательские) */
    getAll: () => Promise<{ success: boolean; data?: ImportTemplate[]; error?: string }>

    /** Получить шаблон по ID */
    getById: (id: string) => Promise<{ success: boolean; data?: ImportTemplate; error?: string }>

    /** Создать шаблон */
    create: (data: ImportTemplateCreateData) => Promise<{ success: boolean; data?: ImportTemplate; error?: string }>

    /** Обновить шаблон */
    update: (
      id: string,
      data: ImportTemplateUpdateData,
    ) => Promise<{ success: boolean; data?: ImportTemplate; error?: string }>

    /** Удалить шаблон */
    delete: (id: string) => Promise<{ success: boolean; error?: string }>

    /** Отметить шаблон как использованный */
    markAsUsed: (id: string) => Promise<{ success: boolean; error?: string }>
  }

  // === История импортов ===
  history: {
    /** Получить все записи истории */
    getAll: () => Promise<{ success: boolean; data?: ImportHistoryEntry[]; error?: string }>

    /** Получить записи с фильтром */
    get: (filter?: ImportHistoryFilter) => Promise<{ success: boolean; data?: ImportHistoryEntry[]; error?: string }>

    /** Получить запись по ID */
    getById: (id: string) => Promise<{ success: boolean; data?: ImportHistoryEntry; error?: string }>

    /** Добавить запись в историю */
    add: (data: ImportHistoryCreateData) => Promise<{ success: boolean; data?: ImportHistoryEntry; error?: string }>

    /** Удалить запись */
    delete: (id: string) => Promise<{ success: boolean; error?: string }>

    /** Очистить историю */
    clear: () => Promise<{ success: boolean; error?: string }>

    /** Получить статистику */
    getStats: () => Promise<{ success: boolean; data?: ImportHistoryStats; error?: string }>

    /** Получить последние N записей */
    getRecent: (limit?: number) => Promise<{ success: boolean; data?: ImportHistoryEntry[]; error?: string }>
  }

  // === События (legacy) ===
  on: {
    /** Подписка на прогресс транскодирования (legacy) */
    transcodeProgress: (callback: (progress: TranscodeProgress & { type: string }) => void) => () => void
  }

  // === Системные логи (main.log) ===
  logs: {
    /** Получить tail последних N строк лога */
    tail: (lines?: number) => Promise<{ content: string; filePath: string | null }>
    /** Старт live-watch — main отправляет новые строки через 'logs:newLines' */
    startWatch: () => Promise<{ success: boolean; error?: string }>
    /** Стоп live-watch */
    stopWatch: () => Promise<{ success: boolean }>
    /** Подписка на новые строки лога */
    onNewLines: (callback: (lines: string[]) => void) => () => void
  }

  // === Автообновления ===
  updater: {
    /** Проверить наличие обновлений */
    check: () => Promise<{ success: boolean; error?: string }>
    /** Скачать обновление */
    download: () => Promise<{ success: boolean; error?: string }>
    /** Установить обновление и перезапустить */
    install: () => Promise<{ success: boolean; error?: string }>
    /** Получить текущий статус обновления */
    getStatus: () => Promise<UpdateStatus>
    /** Получить версию приложения */
    getVersion: () => Promise<string>
    /** Получить changelog из GitHub Releases */
    getChangelog: (version: string) => Promise<{ success: boolean; changelog?: string | null; error?: string }>
    /** Подписка на изменение статуса обновления */
    onStatusChange: (callback: (status: UpdateStatus) => void) => () => void
    /** Подписка на получение changelog */
    onChangelog: (callback: (data: { version: string; changelog: string }) => void) => () => void
  }

  // === IPFS (Kubo) ===
  ipfs: {
    /** Получить статус ноды */
    status: () => Promise<{ success: boolean; data?: IpfsServiceStatus; error?: string }>

    /** Получить P2P диагностику (inbound/outbound, транспорты, адреса) */
    diagnostics: () => Promise<{ success: boolean; data?: P2PDiagnostics | null; error?: string }>

    /** Получить PeerId текущей ноды */
    getPeerId: () => Promise<{ success: boolean; data?: string | null; error?: string }>

    /** Запустить ноду */
    start: () => Promise<{ success: boolean; error?: string }>

    /** Остановить ноду */
    stop: () => Promise<{ success: boolean; error?: string }>

    /** Подписка на изменение статуса */
    onStatusChanged: (callback: (status: IpfsServiceStatus) => void) => () => void

    /** Подписка на подключение пира */
    onPeerConnected: (callback: (peerId: string) => void) => () => void

    /** Подписка на отключение пира */
    onPeerDisconnected: (callback: (peerId: string) => void) => () => void

    /** Подписка на ошибки */
    onError: (callback: (error: string) => void) => () => void

    // === Операции с контентом ===

    /** Добавить файл в IPFS */
    addFile: (filePath: string) => Promise<{ success: boolean; data?: IpfsAddResult; error?: string }>

    /** Добавить директорию в IPFS */
    addDirectory: (
      dirPath: string,
      recursive?: boolean,
    ) => Promise<{ success: boolean; data?: { files: IpfsAddResult[]; rootCid: string }; error?: string }>

    /** Прочитать контент по CID (возвращает base64) */
    cat: (cid: string) => Promise<{ success: boolean; data?: string; error?: string }>

    /** Получить статистику по CID */
    stat: (cid: string) => Promise<{ success: boolean; data?: IpfsStatResult; error?: string }>

    /** Проверить наличие контента локально */
    has: (cid: string) => Promise<{ success: boolean; data?: boolean; error?: string }>

    /** Сохранить контент из IPFS в файл */
    saveToFile: (cid: string, outputPath: string) => Promise<{ success: boolean; error?: string }>

    // === Kubo Gateway (прямой доступ) ===

    /** Получить URL Kubo gateway (для прямого доступа к IPFS контенту из renderer) */
    kuboGetGatewayUrl: () => Promise<{ success: boolean; data?: string | null; error?: string }>

    // === Repo ===

    /** Запустить Garbage Collection — удалить неиспользуемые блоки */
    repoGc: () => Promise<{ success: boolean; data?: { blocksRemoved: number }; error?: string }>

    // === Pinning ===

    /** Закрепить контент */
    pin: (cid: string, name?: string) => Promise<{ success: boolean; data?: PinInfo; error?: string }>

    /** Открепить контент */
    unpin: (cid: string) => Promise<{ success: boolean; data?: boolean; error?: string }>

    /** Проверить, закреплён ли контент */
    isPinned: (cid: string) => Promise<{ success: boolean; data?: boolean; error?: string }>

    /** Получить информацию о pin */
    getPin: (cid: string) => Promise<{ success: boolean; data?: PinInfo | null; error?: string }>

    /** Список всех pins */
    listPins: () => Promise<{ success: boolean; data?: PinInfo[]; error?: string }>

    /** Статистика pins */
    pinStats: () => Promise<{ success: boolean; data?: PinStats; error?: string }>

    /** Переименовать pin */
    renamePin: (cid: string, name: string) => Promise<{ success: boolean; data?: boolean; error?: string }>

    /** Аудит: найти осиротевшие pins */
    findOrphanedPins: () => Promise<{
      success: boolean
      data?: {
        dbCids: string[]
        referencedCids: string[]
        pinnedCids: string[]
        orphanedPins: PinInfo[]
        missingPins: string[]
        errors: string[]
      }
      error?: string
    }>

    /** Подписка на прогресс аудита */
    onAuditProgress: (callback: (data: { current: number; total: number; name: string }) => void) => () => void

    /** Подписка на шаги аудита */
    onAuditStep: (callback: (data: { step: string }) => void) => () => void

    /** Массовое удаление recursive pin'ов (параллельно) */
    bulkUnpin: (cids: string[]) => Promise<{
      success: boolean
      data?: { unpinned: number; failed: number; total: number }
      error?: string
    }>

    /** Подписка на прогресс массового удаления */
    onBulkUnpinProgress: (callback: (data: { current: number; total: number }) => void) => () => void

    /** Нормализация pins — одноразовая чистка лишних recursive pin'ов */
    normalizePins: () => Promise<{
      success: boolean
      data?: {
        unpinned: number
        kept: number
        errors: number
        directoriesProcessed: number
        directoriesFailed: number
      }
      error?: string
    }>

    /** Подписка на шаги нормализации pins */
    onNormalizeStep: (callback: (data: { step: string; current?: number; total?: number }) => void) => () => void

    /** PeerSync: получить статус */
    getSyncedPeers: () => Promise<{
      success: boolean
      data?: {
        peers: Array<{
          id: string
          name: string
          role: 'pinner' | 'relay' | 'gateway'
          peerId: string
          multiaddrs: string[]
          peeringRole: 'bootstrap' | 'peering' | 'both'
        }>
        lastSyncAt: number | null
        lastResponseUpdatedAt: string | null
        lastReconnectAt: number | null
        source: 'api' | 'cache' | 'hardcoded'
        lastError: string | null
      }
      error?: string
    }>

    /** PeerSync: форсированный sync */
    forceSyncPeers: () => Promise<{
      success: boolean
      data?: {
        success: boolean
        source: string
        peersCount: number
        addedCount: number
        removedCount: number
        error?: string
      }
      error?: string
    }>

    /** PeerSync: форсированный reconnect cycle */
    forceReconnect: () => Promise<{
      success: boolean
      data?: { success: boolean; error?: string }
      error?: string
    }>

    /** Закрепить missing pins (referenced в БД, но не в Kubo) */
    pinMissing: (cids: string[]) => Promise<{
      success: boolean
      data?: { pinned: number; failed: number }
      error?: string
    }>

    /** Подписка на закрепление контента */
    onPinned: (callback: (pin: PinInfo) => void) => () => void

    /** Подписка на открепление контента */
    onUnpinned: (callback: (pin: PinInfo) => void) => () => void

    // === IPNS ===

    /** Опубликовать CID под IPNS именем текущей ноды */
    ipnsPublish: (
      cid: string,
      lifetime?: string,
    ) => Promise<{ success: boolean; data?: IpnsPublishResult; error?: string }>

    /** Разрешить IPNS имя в CID */
    ipnsResolve: (name: string) => Promise<{ success: boolean; data?: IpnsResolveResult; error?: string }>

    /** Получить IPNS имя текущей ноды (PeerId) */
    ipnsGetName: () => Promise<{ success: boolean; data?: string | null; error?: string }>

    /** Переопубликовать все IPNS записи (продление срока жизни) */
    ipnsRepublish: () => Promise<{ success: boolean; error?: string }>

    /** Подписка на публикацию IPNS */
    onIpnsPublished: (callback: (result: IpnsPublishResult) => void) => () => void

    /** Подписка на разрешение IPNS */
    onIpnsResolved: (callback: (result: { name: string } & IpnsResolveResult) => void) => () => void

    // === P2P Sharing (Subscriptions) ===

    /** Получить список всех подписок */
    subscriptionList: () => Promise<{ success: boolean; data?: Subscription[]; error?: string }>

    /** Получить подписку по ID */
    subscriptionGet: (id: string) => Promise<{ success: boolean; data?: Subscription | null; error?: string }>

    /** Добавить подписку */
    subscriptionAdd: (
      data: SubscriptionCreateData,
    ) => Promise<{ success: boolean; data?: Subscription; error?: string }>

    /** Удалить подписку */
    subscriptionRemove: (id: string) => Promise<{ success: boolean; data?: boolean; error?: string }>

    /** Обновить настройки подписки */
    subscriptionUpdate: (
      id: string,
      data: Partial<Pick<Subscription, 'displayName' | 'autoPin' | 'autoPinLimit'>>,
    ) => Promise<{ success: boolean; data?: Subscription | null; error?: string }>

    /** Обновить данные подписки (проверить IPNS) */
    subscriptionRefresh: (id: string) => Promise<{ success: boolean; data?: SubscriptionRefreshResult; error?: string }>

    /** Обновить все подписки */
    subscriptionRefreshAll: () => Promise<{ success: boolean; data?: SubscriptionRefreshResult[]; error?: string }>

    /** Загрузить библиотеку подписки из IPFS по lastKnownCid */
    subscriptionFetchLibrary: (
      id: string,
    ) => Promise<{ success: boolean; data?: PublishedLibrary | null; error?: string }>

    /** Подписка на добавление подписки */
    onSubscriptionAdded: (callback: (subscription: Subscription) => void) => () => void

    /** Подписка на удаление подписки */
    onSubscriptionRemoved: (callback: (subscription: Subscription) => void) => () => void

    /** Подписка на обновление подписки */
    onSubscriptionUpdated: (callback: (subscription: Subscription) => void) => () => void

    /** Подписка на обновление данных подписки (refresh) */
    onSubscriptionRefreshed: (callback: (result: SubscriptionRefreshResult) => void) => () => void

    /** Подписка на обновление всех подписок */
    onSubscriptionAllRefreshed: (callback: (results: SubscriptionRefreshResult[]) => void) => () => void

    // === Library Publishing ===

    /** Получить конфигурацию публикации */
    publisherGetConfig: () => Promise<{ success: boolean; data?: PublisherConfig; error?: string }>

    /** Обновить конфигурацию публикации */
    publisherUpdateConfig: (
      updates: Partial<PublisherConfig>,
    ) => Promise<{ success: boolean; data?: PublisherConfig; error?: string }>

    /** Опубликовать библиотеку (автоматически получает данные из БД) */
    publisherPublish: () => Promise<{ success: boolean; data?: PublishResult; error?: string }>

    /** Получить количество аниме для публикации */
    publisherGetAnimeCount: () => Promise<{
      success: boolean
      data?: { animeCount: number; episodeCount: number }
      error?: string
    }>

    /** Получить опубликованную библиотеку */
    publisherGetPublished: () => Promise<{ success: boolean; data?: PublishedLibrary | null; error?: string }>

    /** Подписка на прогресс публикации */
    onPublisherProgress: (callback: (progress: PublishProgress) => void) => () => void

    /** Подписка на завершение публикации */
    onPublisherPublished: (callback: (result: PublishResult) => void) => () => void

    /** Подписка на обновление конфигурации */
    onPublisherConfigUpdated: (callback: (config: PublisherConfig) => void) => () => void

    // === Миграция и очистка библиотеки ===

    /** Получить количество эпизодов для миграции в IPFS */
    publisherGetMigrationCount: () => Promise<{ success: boolean; data?: { count: number }; error?: string }>

    /** Мигрировать контент в IPFS */
    publisherMigrateToIpfs: () => Promise<{
      success: boolean
      data?: {
        total: number
        migrated: number
        failed: number
        errors: Array<{ episodeId: string; animeName: string; episodeNumber: number; error: string }>
      }
      error?: string
    }>

    /** Подписка на прогресс миграции */
    onPublisherMigrationProgress: (
      callback: (progress: { current: number; total: number; animeName: string; episodeNumber: number }) => void,
    ) => () => void

    /** Удалить контент конкретного аниме из IPFS (вызывать ПЕРЕД удалением из БД) */
    publisherDeleteAnimeContent: (
      animeId: string,
    ) => Promise<{ success: boolean; data?: { deletedCids: number; cids: string[] }; error?: string }>

    /** Очистить библиотеку (удалить все аниме из БД и IPFS) */
    publisherClearLibrary: () => Promise<{
      success: boolean
      data?: { deletedCount: number; deletedBytes: number }
      error?: string
    }>

    // === Tracker Integration ===

    /** Получить конфигурацию tracker */
    trackerGetConfig: () => Promise<{
      success: boolean
      data?: { baseUrl: string; apiKey: string; enabled: boolean }
      error?: string
    }>

    /** Обновить конфигурацию tracker */
    trackerUpdateConfig: (updates: { baseUrl?: string; apiKey?: string; enabled?: boolean }) => Promise<{
      success: boolean
      data?: { baseUrl: string; apiKey: string; enabled: boolean }
      error?: string
    }>

    /** Проверить подключение к tracker */
    trackerTestConnection: () => Promise<{
      success: boolean
      data?: { success: boolean; message: string; trackerName?: string }
      error?: string
    }>

    /** Опубликовать аниме на tracker по directoryCid */
    trackerPublish: (directoryCid: string) => Promise<{
      success: boolean
      data?: {
        success: boolean
        animeId?: string
        status?: string
        episodeCount?: number
        error?: string
        isReplacement?: boolean
        replacesAnimeId?: string
      }
      error?: string
    }>

    /** Пакетная публикация аниме на tracker */
    trackerBatchPublish: (items: Array<{ directoryCid: string; animeName: string }>) => Promise<{
      success: boolean
      data?: {
        total: number
        successCount: number
        errorCount: number
        cancelledCount: number
        results: Array<{
          directoryCid: string
          animeName: string
          result: {
            success: boolean
            animeId?: string
            status?: string
            episodeCount?: number
            error?: string
            isReplacement?: boolean
            replacesAnimeId?: string
          }
        }>
      }
      error?: string
    }>

    /** Отменить пакетную публикацию */
    trackerCancelBatch: () => Promise<{ success: boolean; error?: string }>

    /** Подписка на прогресс пакетной публикации */
    onTrackerBatchProgress: (
      callback: (progress: {
        current: number
        total: number
        currentAnimeName: string
        currentDirectoryCid: string
        result?: {
          success: boolean
          animeId?: string
          status?: string
          episodeCount?: number
          error?: string
          isReplacement?: boolean
          replacesAnimeId?: string
        }
      }) => void,
    ) => () => void

    // === Subscription Scheduler ===

    /** Получить статус планировщика */
    schedulerGetStatus: () => Promise<{ success: boolean; data?: SchedulerStatus; error?: string }>

    /** Получить конфигурацию планировщика */
    schedulerGetConfig: () => Promise<{ success: boolean; data?: SchedulerConfig; error?: string }>

    /** Обновить конфигурацию планировщика */
    schedulerUpdateConfig: (
      updates: Partial<SchedulerConfig>,
    ) => Promise<{ success: boolean; data?: SchedulerConfig; error?: string }>

    /** Запустить планировщик */
    schedulerStart: () => Promise<{ success: boolean; error?: string }>

    /** Остановить планировщик */
    schedulerStop: () => Promise<{ success: boolean; error?: string }>

    /** Проверить подписки сейчас */
    schedulerCheckNow: () => Promise<{ success: boolean; data?: SubscriptionRefreshResult[]; error?: string }>

    /** Подписка на изменение статуса планировщика */
    onSchedulerStatusChanged: (callback: (status: SchedulerStatus) => void) => () => void

    /** Подписка на обновление конфигурации планировщика */
    onSchedulerConfigUpdated: (callback: (config: SchedulerConfig) => void) => () => void

    /** Подписка на результаты проверки подписок */
    onSchedulerChecked: (callback: (results: SubscriptionRefreshResult[]) => void) => () => void

    // === Remote Pinning (Pinata) ===

    /** Получить конфигурацию remote pinning */
    remotePinGetConfig: () => Promise<{ success: boolean; data?: RemotePinConfig; error?: string }>

    /** Обновить конфигурацию remote pinning */
    remotePinUpdateConfig: (
      updates: Partial<RemotePinConfig>,
    ) => Promise<{ success: boolean; data?: RemotePinConfig; error?: string }>

    /** Обновить конфигурацию Pinata */
    remotePinUpdatePinataConfig: (
      updates: Partial<PinataConfig>,
    ) => Promise<{ success: boolean; data?: RemotePinConfig; error?: string }>

    /** Проверить JWT токен Pinata */
    remotePinTestAuth: (jwt: string) => Promise<{ success: boolean; data?: { valid: boolean }; error?: string }>

    /** Закрепить CID на Pinata */
    remotePinPin: (
      cid: string,
      options?: RemotePinOptions,
    ) => Promise<{ success: boolean; data?: PinataPinJob; error?: string }>

    /** Открепить CID с Pinata */
    remotePinUnpin: (cid: string) => Promise<{ success: boolean; error?: string }>

    /** Получить список пинов на Pinata */
    remotePinList: (
      limit?: number,
      offset?: number,
    ) => Promise<{ success: boolean; data?: RemotePin[]; error?: string }>

    /** Получить информацию о пине */
    remotePinGet: (cid: string) => Promise<{ success: boolean; data?: RemotePin | null; error?: string }>

    /** Проверить, закреплён ли CID на Pinata */
    remotePinIsPinned: (cid: string) => Promise<{ success: boolean; data?: boolean; error?: string }>

    /** Получить статистику Pinata */
    remotePinStats: () => Promise<{ success: boolean; data?: PinataStats; error?: string }>

    /** Обновить метаданные пина */
    remotePinUpdateMetadata: (
      cid: string,
      name: string,
      keyvalues?: Record<string, string>,
    ) => Promise<{ success: boolean; error?: string }>

    /** Получить статус pin job */
    remotePinGetJobStatus: (jobId: string) => Promise<{ success: boolean; data?: PinataPinJob; error?: string }>

    /** Подписка на старт пининга */
    onRemotePinStarted: (callback: (job: PinataPinJob) => void) => () => void

    /** Подписка на открепление */
    onRemotePinUnpinned: (callback: (data: { cid: string }) => void) => () => void

    /** Подписка на обновление конфигурации */
    onRemotePinConfigUpdated: (callback: (config: RemotePinConfig) => void) => () => void
  }

  // === Kubo (Go IPFS) ===
  kubo: {
    /** Получить статус Kubo сервиса */
    status: () => Promise<{ success: boolean; data?: KuboServiceStatus; error?: string }>

    /** Запустить Kubo (детекция IPFS Desktop → embedded fallback) */
    start: () => Promise<{ success: boolean; error?: string }>

    /** Остановить Kubo */
    stop: () => Promise<{ success: boolean; error?: string }>

    /** Получить PeerId ноды */
    getPeerId: () => Promise<{ success: boolean; data?: string | null; error?: string }>

    /** Получить режим работы (external/embedded/none) */
    getMode: () => Promise<{ success: boolean; data?: KuboMode; error?: string }>

    /** Получить URL Gateway */
    getGatewayUrl: () => Promise<{ success: boolean; data?: string | null; error?: string }>

    /** Подписка на изменение статуса */
    onStatusChanged: (callback: (status: KuboServiceStatus) => void) => () => void

    /** Подписка на подключение пира */
    onPeerConnected: (callback: (peerId: string) => void) => () => void

    /** Подписка на отключение пира */
    onPeerDisconnected: (callback: (peerId: string) => void) => () => void

    /** Подписка на ошибки */
    onError: (callback: (error: string) => void) => () => void
  }

  // === Federation (Tracker Sync) ===
  federation: {
    /** Получить настройки федерации */
    getSettings: () => Promise<FederationOperationResult<FederationSettings>>

    /** Обновить настройки федерации */
    updateSettings: (
      update: Partial<Omit<FederationSettings, 'hasPrivateKey'>>,
    ) => Promise<FederationOperationResult<FederationSettings>>

    /** Сгенерировать ключи для HTTP Signatures */
    generateKeys: () => Promise<FederationOperationResult<{ publicKeyPem: string }>>

    /** Обнаружить трекер по URL (WebFinger) */
    discover: (url: string) => Promise<FederationOperationResult<DiscoverResult>>

    /** Получить список известных трекеров */
    listTrackers: () => Promise<FederationOperationResult<TrackerInfo[]>>

    /** Добавить трекер */
    addTracker: (options: AddTrackerOptions) => Promise<FederationOperationResult<TrackerInfo>>

    /** Удалить трекер */
    removeTracker: (trackerId: string) => Promise<FederationOperationResult<void>>

    /** Обновить информацию о трекере */
    refreshTracker: (trackerId: string) => Promise<FederationOperationResult<TrackerInfo>>

    /** Установить уровень доверия трекера */
    setTrust: (trackerId: string, trustLevel: TrustLevel) => Promise<FederationOperationResult<TrackerInfo>>

    /** Заблокировать трекер */
    blockTracker: (trackerId: string) => Promise<FederationOperationResult<void>>

    /** Разблокировать трекер */
    unblockTracker: (trackerId: string) => Promise<FederationOperationResult<void>>

    /** Синхронизировать контент с трекером */
    sync: (trackerId: string, options?: SyncOptions) => Promise<FederationOperationResult<SyncResult>>

    /** Синхронизировать со всеми доверенными трекерами */
    syncAll: (options?: SyncOptions) => Promise<FederationOperationResult<SyncResult[]>>

    /** Получить глобальную статистику сидеров для CID */
    getGlobalSeeders: (cid: string) => Promise<FederationOperationResult<GlobalSeederStats>>

    /** Получить trust score трекера */
    getTrustScore: (trackerId: string) => Promise<FederationOperationResult<number>>
  }

  // === Stats — Статистика пользователя ===
  stats: {
    /** Получить текущую статистику */
    get: () => Promise<{ success: boolean; data?: UserStats; error?: string }>
    /** Получить историю по дням */
    getDailyHistory: (days?: number) => Promise<{ success: boolean; data?: DailyStats[]; error?: string }>
    /** Сбросить статистику (для тестов) */
    reset: () => Promise<{ success: boolean; data?: UserStats; error?: string }>
    /** Получить текущую сессию */
    getCurrentSession: () => Promise<{
      success: boolean
      data?: { durationMs: string; isActive: boolean }
      error?: string
    }>
    /** Подписка на обновление статистики */
    onUpdated: (callback: (event: StatsUpdatedEvent) => void) => () => void
    /** Подписка на начало сессии */
    onSessionStarted: (callback: () => void) => () => void
    /** Подписка на конец сессии */
    onSessionEnded: (callback: () => void) => () => void
  }

  // === Reputation — Репутация пользователя ===
  reputation: {
    /** Получить репутацию */
    get: () => Promise<{ success: boolean; data?: UserReputation; error?: string }>
    /** Пересчитать репутацию */
    recalculate: () => Promise<{ success: boolean; data?: UserReputation; error?: string }>
    /** Сбросить репутацию (для тестов) */
    reset: () => Promise<{ success: boolean; data?: UserReputation; error?: string }>
    /** Получить текущий score */
    getScore: () => Promise<{ success: boolean; data?: number; error?: string }>
    /** Подписка на обновление репутации */
    onUpdated: (callback: (reputation: UserReputation) => void) => () => void
    /** Подписка на изменение ранга */
    onRankChanged: (callback: (event: RankChangedEvent) => void) => () => void
  }

  // === Achievements — Достижения пользователя ===
  achievements: {
    /** Получить все достижения с прогрессом */
    getAll: () => Promise<{ success: boolean; data?: AchievementWithProgress[]; error?: string }>
    /** Получить разблокированные достижения */
    getUnlocked: () => Promise<{ success: boolean; data?: AchievementWithProgress[]; error?: string }>
    /** Получить данные достижений */
    get: () => Promise<{ success: boolean; data?: UserAchievements; error?: string }>
    /** Отметить достижение как показанное */
    markNotified: (id: string) => Promise<{ success: boolean; error?: string }>
    /** Проверить все достижения */
    check: () => Promise<{ success: boolean; error?: string }>
    /** Сбросить достижения (для тестов) */
    reset: () => Promise<{ success: boolean; data?: UserAchievements; error?: string }>
    /** Подписка на разблокировку достижения */
    onUnlocked: (callback: (event: AchievementUnlockedEvent) => void) => () => void
    /** Подписка на обновление прогресса */
    onProgress: (callback: (data: { id: string; progress: number }) => void) => () => void
  }

  // === Bonus — Бонусные очки ===
  bonus: {
    /** Получить бонусные очки */
    get: () => Promise<{ success: boolean; data?: BonusPoints; error?: string }>
    /** Получить баланс */
    getBalance: () => Promise<{ success: boolean; data?: number; error?: string }>
    /** Получить историю транзакций */
    getTransactions: (limit?: number) => Promise<{ success: boolean; data?: BonusTransaction[]; error?: string }>
    /** Потратить очки */
    spend: (
      amount: number,
      description: string,
      metadata?: Record<string, unknown>,
    ) => Promise<{
      success: boolean
      data?: { success: boolean; error?: string; transaction?: BonusTransaction; newBalance?: number }
      error?: string
    }>
    /** Сбросить бонусы (для тестов) */
    reset: () => Promise<{ success: boolean; data?: BonusPoints; error?: string }>
    /** Подписка на изменение баланса */
    onBalanceChanged: (
      callback: (event: { oldBalance: number; newBalance: number; transaction: BonusTransaction }) => void,
    ) => () => void
    /** Подписка на заработок очков */
    onPointsEarned: (callback: (data: { amount: number; type: string; description: string }) => void) => () => void
    /** Подписка на трату очков */
    onPointsSpent: (callback: (data: { amount: number; description: string }) => void) => () => void
  }

  // === Export Queue — Очередь экспорта ===
  exportQueue: {
    /** Добавить задачу в очередь */
    add: (data: ExportTaskCreateData) => Promise<ExportQueueResult<ExportTask>>
    /** Отменить задачу */
    cancel: (taskId: string) => Promise<ExportQueueResult>
    /** Приостановить задачу */
    pause: (taskId: string) => Promise<ExportQueueResult>
    /** Возобновить задачу */
    resume: (taskId: string) => Promise<ExportQueueResult>
    /** Повторить неудавшуюся задачу */
    retry: (taskId: string) => Promise<ExportQueueResult>
    /** Получить список задач */
    list: () => Promise<ExportQueueResult<ExportTask[]>>
    /** Получить задачу по ID */
    get: (taskId: string) => Promise<ExportQueueResult<ExportTask>>
    /** Очистить завершённые/отменённые задачи */
    clear: () => Promise<ExportQueueResult<number>>
    /** Получить настройки */
    getSettings: () => Promise<ExportQueueResult<ExportQueueSettings>>
    /** Обновить настройки */
    updateSettings: (settings: Partial<ExportQueueSettings>) => Promise<ExportQueueResult>
    /** Подписка на прогресс задачи */
    onProgress: (callback: (task: ExportTask) => void) => () => void
    /** Подписка на завершение задачи */
    onCompleted: (callback: (task: ExportTask) => void) => () => void
    /** Подписка на ошибку задачи */
    onFailed: (callback: (task: ExportTask) => void) => () => void
    /** Подписка на изменение очереди */
    onUpdated: (callback: (tasks: ExportTask[]) => void) => () => void
  }

  // === Web Export — Экспорт для Web Player ===
  webExport: {
    /** Запуск экспорта для Web Player */
    start: (config: QueueExportConfig, options: WebExportOptions) => Promise<WebExportResult>
    /** Отмена экспорта */
    cancel: () => Promise<void>
    /** Проверка статуса */
    isRunning: () => Promise<boolean>
    /** Подписка на прогресс */
    onProgress: (callback: (progress: WebExportProgress) => void) => () => void
  }

  // === Profile — Профиль пользователя и Friend Code ===
  profile: {
    /** Получить профиль пользователя */
    get: () => Promise<{ success: boolean; data?: UserProfile | null; error?: string }>
    /** Обновить профиль пользователя */
    update: (updates: UserProfileUpdate) => Promise<{ success: boolean; data?: UserProfile | null; error?: string }>
    /** Получить PeerId текущего пользователя */
    getPeerId: () => Promise<{ success: boolean; data?: string | null; error?: string }>
    /** Получить Friend Code текущего пользователя */
    getFriendCode: () => Promise<{ success: boolean; data?: string | null; error?: string }>
    /** Сгенерировать Friend Code из PeerId */
    generateFriendCode: (peerId: string) => Promise<{ success: boolean; data?: string; error?: string }>
    /** Верифицировать Friend Code */
    verifyFriendCode: (code: string, peerId: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Проверить формат Friend Code */
    validateFriendCodeFormat: (code: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Подписка на обновления профиля */
    onUpdated: (callback: (profile: UserProfile) => void) => () => void
  }

  // === Друзья ===
  friends: {
    /** Получить список друзей */
    list: () => Promise<{ success: boolean; data?: Friend[]; error?: string }>
    /** Удалить из друзей */
    remove: (peerId: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Заблокировать пользователя */
    block: (peerId: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Проверить блокировку */
    isBlocked: (peerId: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Отправить запрос в друзья */
    sendRequest: (targetPeerId: string) => Promise<{ success: boolean; data?: FriendRequest | null; error?: string }>
    /** Получить входящие запросы */
    getIncomingRequests: () => Promise<{ success: boolean; data?: FriendRequest[]; error?: string }>
    /** Получить исходящие запросы */
    getOutgoingRequests: () => Promise<{ success: boolean; data?: FriendRequest[]; error?: string }>
    /** Принять запрос */
    acceptRequest: (requestId: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Отклонить запрос */
    rejectRequest: (requestId: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Подписка на новые запросы в друзья */
    onRequestReceived: (callback: (request: FriendRequest) => void) => () => void
    /** Подписка на обновление статуса запроса */
    onRequestUpdated: (callback: (request: FriendRequest) => void) => () => void
    /** Подписка на обновление списка друзей */
    onFriendsUpdated: (callback: (friends: Friend[]) => void) => () => void
  }

  // === Presence (онлайн-статусы) ===
  presence: {
    /** Запустить presence сервис */
    start: () => Promise<{ success: boolean; error?: string }>
    /** Остановить presence сервис */
    stop: () => Promise<{ success: boolean; error?: string }>
    /** Обновить настройки presence */
    updateSettings: (settings: Partial<PresenceSettings>) => Promise<{ success: boolean; error?: string }>
    /** Обновить watching статус */
    setWatching: (watching: WatchingInfo | undefined) => Promise<{ success: boolean; error?: string }>
    /** Получить presence друга */
    getFriendPresence: (peerId: string) => Promise<{ success: boolean; data?: PresenceMessage | null; error?: string }>
    /** Получить все presence */
    getAllPresence: () => Promise<{ success: boolean; data?: Record<string, PresenceMessage>; error?: string }>
    /** Проверить онлайн-статус друга */
    isFriendOnline: (peerId: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Подписка на обновление presence */
    onPresenceUpdated: (callback: (data: { peerId: string; presence: PresenceMessage }) => void) => () => void
    /** Подписка на переход друга в онлайн */
    onFriendOnline: (callback: (peerId: string) => void) => () => void
    /** Подписка на переход друга в оффлайн */
    onFriendOffline: (callback: (peerId: string) => void) => () => void
  }

  // === Watch Party (совместный просмотр) ===
  watchParty: {
    /** Создать комнату */
    create: (options: {
      name: string
      animeName: string
      episodeNumber: number
      filePath?: string
      contentCid?: string
      isPrivate?: boolean
      maxParticipants?: number
    }) => Promise<{ success: boolean; data?: WatchPartyRoom | null; error?: string }>
    /** Присоединиться к комнате */
    join: (roomId: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Покинуть комнату */
    leave: () => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Закрыть комнату (только хост) */
    close: () => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Получить текущую комнату */
    getCurrent: () => Promise<{ success: boolean; data?: string | null; error?: string }>
    /** Получить участников */
    getParticipants: () => Promise<{ success: boolean; data?: WatchPartyParticipant[]; error?: string }>
    /** Получить состояние playback */
    getPlaybackState: () => Promise<{ success: boolean; data?: WatchPartyPlaybackState | null; error?: string }>
    /** Play */
    play: () => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Pause */
    pause: () => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Seek */
    seek: (position: number) => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Отправить сообщение */
    sendMessage: (text: string) => Promise<{ success: boolean; data?: WatchPartyChatMessage | null; error?: string }>
    /** Отправить реакцию */
    sendReaction: (
      reaction: string,
    ) => Promise<{ success: boolean; data?: WatchPartyChatMessage | null; error?: string }>
    /** Подписка на обновление playback */
    onPlaybackUpdated: (callback: (data: { roomId: string; state: WatchPartyPlaybackState }) => void) => () => void
    /** Подписка на присоединение участника */
    onParticipantJoined: (
      callback: (data: { roomId: string; participant: WatchPartyParticipant }) => void,
    ) => () => void
    /** Подписка на уход участника */
    onParticipantLeft: (callback: (data: { roomId: string; peerId: string }) => void) => () => void
    /** Подписка на сообщения чата */
    onMessageReceived: (callback: (data: { roomId: string; message: WatchPartyChatMessage }) => void) => () => void
    /** Подписка на закрытие комнаты */
    onRoomClosed: (callback: (data: { roomId: string }) => void) => () => void
  }

  // === Deep Link — animatrona:// URL ===
  deepLink: {
    /** Подписаться на deep links */
    subscribe: () => Promise<{ success: boolean; error?: string }>
    /** Отписаться от deep links */
    unsubscribe: () => Promise<{ success: boolean; error?: string }>
    /** Сгенерировать invite для Watch Party */
    generateWatchPartyInvite: (
      roomId: string,
      roomName: string,
      hostName: string,
      animeName: string,
    ) => Promise<{ success: boolean; data?: WatchPartyInvite; error?: string }>
    /** Сгенерировать link для добавления друга */
    generateFriendLink: (friendCode: string) => Promise<{ success: boolean; data?: string; error?: string }>
    /** Показать уведомление о приглашении */
    showInviteNotification: (invite: WatchPartyInvite) => Promise<{ success: boolean; error?: string }>
    /** Проверить, поддерживаются ли уведомления */
    notificationsSupported: () => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Подписка на получение deep link */
    onReceived: (
      callback: (data: { type: 'party_join' | 'friend_add' | 'unknown'; data: Record<string, string> }) => void,
    ) => () => void
  }

  // === Mobile Server (доступ к библиотеке с телефона) ===
  mobileServer: {
    /** Запустить мобильный сервер */
    start: (port?: number) => Promise<MobileServerStatus>
    /** Остановить мобильный сервер */
    stop: () => Promise<void>
    /** Получить статус сервера */
    getStatus: () => Promise<MobileServerStatus>
    /** Получить QR-код для подключения (base64 PNG) */
    getQRCode: () => Promise<string | null>
    /** Обновить локальный IP (при смене сети) */
    refreshIp: () => Promise<MobileServerStatus>
    /** Подписка на сохранение прогресса с мобильного устройства */
    onProgressSaved: (callback: (data: { animeId: string; episodeId: string }) => void) => () => void
  }

  // === Автоопределение OP/ED ===
  introDetector: {
    /** Определить OP/ED для списка эпизодов (минимум 2) */
    detect: (episodes: IntroDetectorEpisodeInput[]) => Promise<IntroDetectorResult[]>
    /** Определить OP/ED из IPFS (скачивает видео во temp файлы) */
    detectFromIpfs: (episodes: IntroDetectorIpfsInput[]) => Promise<IntroDetectorResult[]>
    /** Подписка на прогресс определения */
    onProgress: (callback: (percent: number, stage: string) => void) => () => void
  }

  // === Tracker (animatrona-tracker интеграция) ===
  tracker: {
    /** Получить конфигурацию */
    getConfig: () => Promise<TrackerConfig>
    /** Обновить конфигурацию */
    updateConfig: (updates: Partial<TrackerConfig>) => Promise<TrackerConfig>
    /** Проверить подключение */
    testConnection: () => Promise<TrackerConnectionResult>
    /** Опубликовать аниме на tracker */
    publish: (directoryCid: string) => Promise<{ success: boolean; error?: string }>
    /** Пакетная публикация */
    batchPublish: (items: TrackerBatchItem[]) => Promise<TrackerBatchResult>
    /** Отменить пакетную публикацию */
    cancelBatch: () => Promise<void>
    /** Подписка на прогресс пакетной публикации */
    onBatchProgress: (callback: (progress: TrackerBatchProgress) => void) => () => void
    /** Получить список раздач */
    getDistributions: () => Promise<{ success: boolean; data?: unknown[]; error?: string }>
    /** Получить каталог аниме с трекера */
    getCatalog: (params?: { page?: number; limit?: number; q?: string }) => Promise<TrackerCatalogResult>
    /** Получить детали аниме с трекера */
    getAnimeDetail: (animeId: string) => Promise<TrackerAnimeDetailResult>
    /** Синхронизировать библиотеку с трекером */
    syncLibrary: () => Promise<TrackerSyncResult>
    /** Получить библиотеку с трекера (для восстановления) */
    getLibrary: () => Promise<{ success: boolean; data?: TrackerLibraryItem[]; error?: string }>
    /** Добавить аниме из трекера в библиотеку */
    addToLibrary: (animeId: string) => Promise<TrackerAddToLibraryResult>
    /** Открепить контент аниме (освобождение места) */
    unpinAnime: (animeId: string) => Promise<{ success: boolean; error?: string }>
    /** Закрепить контент аниме (скачать с пиров на диск) */
    repinAnime: (animeId: string) => Promise<{ success: boolean; error?: string }>
    /** Пакетное изменение статуса просмотра */
    batchUpdateWatchStatus: (input: {
      animeIds: string[]
      watchStatus: string
    }) => Promise<{ success: boolean; count: number }>
    /** Пакетный аспин аниме */
    batchUnpinAnime: (animeIds: string[]) => Promise<{ success: boolean; count: number; failed: number }>
    /** Подписка на прогресс пакетного аспина */
    onBatchUnpinProgress: (cb: (progress: { current: number; total: number; animeName: string }) => void) => () => void
    /** Отправить прогресс просмотра на трекер */
    pushWatchProgress: (params: {
      trackerAnimeId: string
      episodeNumber: number
      currentTime: number
      duration: number
      completed?: boolean
    }) => Promise<void>
    /** Немедленно запушить watchStatus одного аниме на трекер */
    pushLibraryItem: (animeId: string) => Promise<void>
    /** Запустить фоновую синхронизацию */
    startSync: () => Promise<void>
    /** Остановить фоновую синхронизацию */
    stopSync: () => Promise<void>
    /** Подписка на завершение синхронизации */
    onSyncCompleted: (callback: (data: { synced: number; serverItems: number }) => void) => () => void
    /** Подписка на обновление профиля с трекера */
    onProfileUpdated: (callback: (profile: TrackerUserProfile) => void) => () => void
  }

  // === Перекодировка аудио ===
  audioReencode: {
    /** Предпросмотр: список дорожек для перекодировки */
    preview: (
      animeId: string,
      targetBitrate: number,
    ) => Promise<{ success: boolean; data?: ReencodePreview; error?: string }>
    /** Запуск перекодировки */
    start: (
      animeId: string,
      targetBitrate: number,
    ) => Promise<{ success: boolean; data?: ReencodeResult; error?: string }>
    /** Отмена перекодировки */
    cancel: () => Promise<{ success: boolean; error?: string }>
    /** Подписка на прогресс */
    onProgress: (callback: (progress: ReencodeProgress) => void) => () => void
  }

  // === Восстановление дорожек (main process) ===
  restoreTracks: {
    /** Начать восстановление */
    start: (
      tasks: import('../../../../shared/types/restore-tracks').RestoreTask[],
      fontTasks: import('../../../../shared/types/restore-tracks').RestoreFontTask[],
      config: import('../../../../shared/types/restore-tracks').RestoreConfig,
    ) => Promise<{ success: boolean; error?: string }>
    /** Отменить */
    cancel: () => Promise<{ success: boolean }>
    /** Изменить concurrency */
    setConcurrency: (value: number) => Promise<{ success: boolean }>
    /** Получить прогресс */
    getProgress: () => Promise<{
      success: boolean
      data?: import('../../../../shared/types/restore-tracks').RestoreProgress
    }>
    /** Проверить обработку */
    isProcessing: () => Promise<{ success: boolean; data?: boolean }>
    /** Подписка на прогресс */
    onProgress: (
      callback: (progress: import('../../../../shared/types/restore-tracks').RestoreProgress) => void,
    ) => () => void
    /** Задача завершена */
    onTaskCompleted: (callback: (taskId: string, success: boolean) => void) => () => void
    /** Всё завершено */
    onCompleted: (
      callback: (progress: import('../../../../shared/types/restore-tracks').RestoreProgress) => void,
    ) => () => void
    /** Ошибка задачи */
    onTaskError: (callback: (taskId: string, error: string) => void) => () => void
    /** Отменено */
    onCancelled: (callback: () => void) => () => void
  }

  // === Импорт из Рутрекера ===
  rutracker: {
    /** Загружает HTML страницы раздачи по URL */
    fetchPage: (url: string) => Promise<{ success: boolean; data?: string; error?: string }>
    /** Парсит HTML страницы раздачи */
    parse: (html: string, url: string) => Promise<{ success: boolean; data?: RutrackerTorrentInfo; error?: string }>
    /** Полный пайплайн: парсинг + матчинг с Shikimori */
    import: (html: string, url: string) => Promise<{ success: boolean; data?: RutrackerImportResult; error?: string }>
    /** Подтвердить выбранное аниме на Shikimori */
    confirmMatch: (shikimoriId: number) => Promise<{ success: boolean; data?: ShikimoriAnimeExtended; error?: string }>
    /** Запустить скачивание торрента → автоматический импорт по завершении */
    startDownload: (
      params: StartDownloadParams,
    ) => Promise<{ success: boolean; data?: StartDownloadResult; error?: string }>
    /** Метаданные загрузки для кнопки «В очередь» */
    getDownloadMeta: (infoHash: string) => Promise<{
      success: boolean
      data?: {
        shikimoriId: number
        animeName: string
        folderPath: string
        rutrackerUrl?: string
        torrentFileCid?: string
      } | null
      error?: string
    }>
    /** Список активных загрузок */
    getActiveDownloads: () => Promise<{
      success: boolean
      data?: Array<{ infoHash: string; name: string }>
      error?: string
    }>
    /** Отменить загрузку */
    cancelDownload: (
      infoHash: string,
      deleteFiles?: boolean,
    ) => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Подписка на этапы импорта (живой прогресс) */
    onImportStep: (callback: (step: string) => void) => () => void
    /**
     * Найти источник для торрента, добавленного вручную (не через Animatrona), по ссылке
     * в comment раздачи qBittorrent. Без повторного скачивания — файлы уже на диске/качаются.
     */
    findSourceForTorrent: (infoHash: string) => Promise<{
      success: boolean
      data?: { found: false } | { found: true; linked: boolean; url: string; shikimoriId?: number; animeName?: string }
      error?: string
    }>
  }

  // === Торрент-клиент (qBittorrent) ===
  torrent: {
    /** Инициализировать клиент */
    init: () => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Добавить торрент по магнет-ссылке */
    add: (
      magnetURI: string,
      options: AddTorrentOptions,
    ) => Promise<{ success: boolean; data?: TorrentInfo; error?: string }>
    /** Приостановить торрент */
    pause: (infoHash: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Возобновить торрент */
    resume: (infoHash: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Удалить торрент */
    remove: (infoHash: string, deleteFiles?: boolean) => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Информация об одном торренте */
    get: (infoHash: string) => Promise<{ success: boolean; data?: TorrentInfo | null; error?: string }>
    /** Список всех торрентов */
    getAll: () => Promise<{ success: boolean; data?: TorrentInfo[]; error?: string }>
    /** Обновить метаданные торрента (importStatus, isBundle и т.д.) */
    updateMeta: (
      infoHash: string,
      update: { importStatus?: string; isBundle?: boolean; bundleAnimesJson?: string },
    ) => Promise<{ success: boolean; error?: string }>
    /** Пересчитать хеш торрента (полная верификация кусков) */
    recheck: (infoHash: string) => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Получить список файлов торрента */
    getFiles: (infoHash: string) => Promise<{
      success: boolean
      data?: Array<{ index: number; name: string; size: number; progress: number }>
      error?: string
    }>
    /** Остановить клиент */
    destroy: () => Promise<{ success: boolean; data?: boolean; error?: string }>
    /** Проверить подключение к qBittorrent (без сохранения настроек) */
    testQBittorrentConnection: (config: { url: string; username: string; password: string }) => Promise<{
      success: boolean
      data?: { success: boolean; version?: string; error?: string }
      error?: string
    }>
    /** Подписка на прогресс торрента (компактный формат, без files[]) */
    onProgress: (callback: (progress: TorrentProgress) => void) => () => void
    /** Подписка на добавление торрента */
    onAdded: (callback: (info: TorrentInfo) => void) => () => void
    /** Подписка на завершение скачивания */
    onDone: (callback: (info: TorrentInfo) => void) => () => void
    /** Подписка на ошибки */
    onError: (callback: (data: { infoHash: string; error: string }) => void) => () => void
    /** Подписка на удаление торрента */
    onRemoved: (callback: (data: { infoHash: string }) => void) => () => void
  }
}

/** Результат детекции OP/ED для одного эпизода */
export interface IntroDetectorResult {
  episodeId: string
  introStartMs: number | null
  introEndMs: number | null
  outroStartMs: number | null
  outroEndMs: number | null
}

/** Входные данные эпизода для intro-detector */
export interface IntroDetectorEpisodeInput {
  id: string
  sourcePath: string
  /** Длительность в миллисекундах */
  duration: number
}

/** Входные данные эпизода для intro-detector из IPFS */
export interface IntroDetectorIpfsInput {
  id: string
  /** CID аудиодорожки (AudioTrack.transcodedCid) */
  audioCid: string
  /** Длительность в миллисекундах */
  duration: number
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
    electron?: ElectronAPI
  }
}

export {}
