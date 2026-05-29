// API
export { createApiClient } from './api'
export type {
  AnimeDetails,
  AnimeListItem,
  AnimeRelationInfo,
  ApiClient,
  AudioTrack,
  Chapter,
  ChapterType,
  Episode,
  GetConnectionStore,
  LastWatched,
  Season,
  ServerStatus,
  SubtitleTrack,
  WatchProgress,
  WatchStatus,
} from './api'

// Store
export { createConnectionStore } from './store'
export type { ConnectionData, ConnectionState } from './store'

// Hooks
export { getStoredProgress, useWatchProgress } from './hooks'
export type { UseWatchProgressOptions, UseWatchProgressResult, WatchProgressData } from './hooks'

// Utils
export {
  formatBitrate,
  formatBytes,
  formatDuration,
  formatDurationHuman,
  formatDurationMs,
  isNetworkError,
  normalizeServerUrl,
} from './utils'

// Deprecated — используй formatDuration из utils
export { formatTimeForDisplay } from './hooks'
