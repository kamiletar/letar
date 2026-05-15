/**
 * Типы для перекодировки аудиодорожек
 * Общие для main и renderer
 */

/** Прогресс одной дорожки */
export interface ReencodeTrackProgress {
  trackId: string
  trackTitle: string
  episodeNumber: number
  status: 'pending' | 'downloading' | 'transcoding' | 'uploading' | 'done' | 'error'
  percent: number
  error?: string
  savedBytes?: number
}

/** Общий прогресс перекодировки */
export interface ReencodeProgress {
  tracks: ReencodeTrackProgress[]
  currentTrackIndex: number
  completedTracks: number
  totalTracks: number
  savedBytes: number
}

/** Результат перекодировки */
export interface ReencodeResult {
  reencoded: number
  skipped: number
  failed: number
  savedBytes: number
}

/** Предпросмотр перекодировки */
export interface ReencodePreview {
  tracks: Array<{
    id: string
    title: string
    episodeNumber: number
    bitrate: number | null
    ipfsSize: number | null
    channels: string | null
  }>
  totalSize: number
  estimatedSaving: number
}

// === Пакетная перекодировка ===

/** Предпросмотр пакетной перекодировки — информация по каждому аниме */
export interface BatchReencodeAnimeInfo {
  id: string
  name: string
  trackCount: number
  totalSize: number
  estimatedSaving: number
}

/** Предпросмотр пакетной перекодировки */
export interface BatchReencodePreview {
  animes: BatchReencodeAnimeInfo[]
  totalTracks: number
  totalSize: number
  totalEstimatedSaving: number
}

/** Прогресс пакетной перекодировки */
export interface BatchReencodeProgress {
  currentAnimeIndex: number
  totalAnimes: number
  currentAnimeName: string
  completedAnimes: number
  /** Прогресс дорожек текущего аниме */
  trackProgress: ReencodeProgress | null
  totalSavedBytes: number
}

/** Результат пакетной перекодировки для одного аниме */
export interface BatchReencodeAnimeResult {
  animeId: string
  animeName: string
  result: ReencodeResult
}

/** Итоговый результат пакетной перекодировки */
export interface BatchReencodeResult {
  totalReencoded: number
  totalFailed: number
  totalSavedBytes: number
  animeResults: BatchReencodeAnimeResult[]
}
