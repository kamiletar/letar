/**
 * Типы данных API Animatrona Server
 *
 * Общие типы для animatrona-mobile и animatrona-tv
 */

/** Статус сервера */
export interface ServerStatus {
  version: string
  libraryPath: string | null
  animeCount: number
  server: {
    isRunning: boolean
    port: number | null
    localIp: string | null
    url: string | null
    requestCount: number
  }
}

/** Связь между аниме (для графовой группировки франшиз) */
export interface AnimeRelationInfo {
  targetShikimoriId: number
  targetAnimeId: string | null
  relationKind: string // SEQUEL, PREQUEL, SIDE_STORY, PARENT_STORY, SUMMARY, FULL_STORY, SPIN_OFF, ADAPTATION
}

/** Аниме в списке */
export interface AnimeListItem {
  id: string
  name: string
  originalName: string | null
  year: number | null
  status: string
  episodeCount: number
  description: string | null
  rating: number | null
  posterPath: string | null
  watchStatus: WatchStatus
  watchedEpisodes: number
  lastWatchedEpisode: number | null
  /** Ключ группировки по франшизе (franchiseId или rootShikimoriId) */
  franchiseKey?: string | null
  /** Название франшизы */
  franchiseName?: string | null
  /** Shikimori ID (для альтернативной группировки) */
  shikimoriId?: number | null
  /** Связи с другими аниме (для графовой группировки) */
  relations?: AnimeRelationInfo[]
}

/** Статус просмотра */
export type WatchStatus = 'NOT_STARTED' | 'WATCHING' | 'COMPLETED' | 'ON_HOLD' | 'PLANNED' | 'DROPPED'

/** Аудиодорожка */
export interface AudioTrack {
  id: string
  language: string
  title: string | null
  /** Отображаемое имя дорожки */
  name: string | null
  dubGroup: string | null
  codec: string
  channels: string
  isDefault: boolean
  /** CID транскодированного аудио в IPFS */
  audioCid: string | null
}

/** Субтитры */
export interface SubtitleTrack {
  id: string
  language: string
  title: string | null
  /** Отображаемое имя дорожки */
  name: string | null
  dubGroup: string | null
  format: 'ass' | 'ssa' | 'srt' | 'vtt' | 'sub'
  isDefault: boolean
  /** CID файла в IPFS */
  fileCid: string | null
  /** CID шрифтов для ASS субтитров */
  fontCids: string[]
}

/** Тип главы */
export type ChapterType = 'CHAPTER' | 'OP' | 'ED' | 'RECAP' | 'PREVIEW'

/** Глава эпизода */
export interface Chapter {
  id: string
  startMs: number
  endMs: number
  title: string | null
  type: ChapterType
  skippable: boolean
}

/** Прогресс просмотра */
export interface WatchProgress {
  currentTime: number
  completed: boolean
  lastWatchedAt: string
}

/** Эпизод */
export interface Episode {
  id: string
  number: number
  name: string | null
  durationMs: number | null
  seasonNumber: number
  seasonName: string | null
  videoPath: string | null
  videoCid: string | null
  progress: WatchProgress | null
  audioTracks: AudioTrack[]
  subtitleTracks: SubtitleTrack[]
  chapters: Chapter[]
}

/** Сезон */
export interface Season {
  number: number
  name: string | null
  type: string
  episodeCount: number
}

/** Детали аниме */
export interface AnimeDetails {
  id: string
  name: string
  originalName: string | null
  year: number | null
  status: string
  episodeCount: number
  description: string | null
  rating: number | null
  posterPath: string | null
  watchStatus: WatchStatus
  genres: string[]
  seasons: Season[]
  episodes: Episode[]
}

/** Последний просмотренный эпизод */
export interface LastWatched {
  anime: {
    id: string
    name: string
    posterPath: string | null
  }
  episode: {
    id: string
    number: number
    name: string | null
    durationMs: number | null
  }
  progress: WatchProgress
}
