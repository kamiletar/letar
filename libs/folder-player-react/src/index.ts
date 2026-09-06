// Контракт хоста и хранилища
export type {
  ExternalAudioMatch,
  ExternalAudioScanResult,
  ExternalSubtitleMatch,
  ExternalSubtitleScanResult,
  FileFilter,
  FolderPlayerHost,
  FolderPlayerStorage,
  MediaFileInfo,
  MediaProbeInfo,
  MediaProbeResult,
  ProbedAudioTrack,
  ProbedSubtitleTrack,
} from './lib/host'

// Типы папочного режима
export { BONUS_PATTERNS, detectBonusCategory, isBonusVideo } from './lib/types'
export type {
  BonusCategory,
  EmbeddedAudioTrack,
  EmbeddedSubtitleTrack,
  EmbeddedTracksInfo,
  ExternalTracksInfo,
  FolderEpisode,
  FolderHistoryEntry,
  FolderHistoryStorage,
  FolderPlayerState,
  PlayerMode,
  WatchProgressEntry,
  WatchProgressStorage,
} from './lib/types'

// Парсинг номеров эпизодов
export { parseEpisodeInfo, parseEpisodeNumber } from './lib/parse-filename'
export type { EpisodeType, ParsedEpisodeInfo } from './lib/parse-filename'

// Кэш проб медиафайлов
export { clearProbeCache, getCachedProbe, getProbeCacheStats, invalidateProbeCache } from './lib/probe-cache'

// Хуки
export { useExternalAudio } from './lib/useExternalAudio'
export { useFolderHistory } from './lib/useFolderHistory'
export { useFolderPlayer, type UseFolderPlayerReturn } from './lib/useFolderPlayer'
export { useWatchProgress } from './lib/useWatchProgress'

// Компоненты
export { EpisodeSidebar } from './lib/EpisodeSidebar'
export { RecentFoldersCard } from './lib/RecentFoldersCard'
