/**
 * Типы для Mobile Server
 */

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

/** Аниме для мобильного API */
export interface MobileAnime {
  id: string
  name: string
  originalName: string | null
  year: number | null
  status: string
  episodeCount: number
  description: string | null
  rating: number | null
  posterPath: string | null
  /** CID постера в IPFS (приоритет над posterPath) */
  posterCid: string | null
  watchStatus: string
  /** Количество просмотренных эпизодов */
  watchedEpisodes: number
  /** Последний просмотренный эпизод */
  lastWatchedEpisode: number | null
  /** Shikimori ID аниме */
  shikimoriId: number | null
  /** ID франшизы (ключ для группировки) */
  franchiseKey: string | null
  /** Название франшизы */
  franchiseName: string | null
}

/** Тип главы */
export type ChapterType = 'CHAPTER' | 'OP' | 'ED' | 'RECAP' | 'PREVIEW'

/** Глава эпизода */
export interface MobileChapter {
  id: string
  startMs: number
  endMs: number
  title: string | null
  type: ChapterType
  skippable: boolean
}

/** Эпизод для мобильного API */
export interface MobileEpisode {
  id: string
  number: number
  name: string | null
  durationMs: number | null
  seasonNumber: number
  seasonName: string | null
  /** Путь к видеофайлу (для локальных файлов) */
  videoPath: string | null
  /** CID видео в IPFS (для транскодированных файлов) */
  videoCid: string | null
  /** Прогресс просмотра */
  progress: MobileWatchProgress | null
  /** Аудиодорожки */
  audioTracks: MobileAudioTrack[]
  /** Субтитры */
  subtitleTracks: MobileSubtitleTrack[]
  /** Главы (интро, эндинг и т.д.) */
  chapters: MobileChapter[]
}

/** Аудиодорожка */
export interface MobileAudioTrack {
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
export interface MobileSubtitleTrack {
  id: string
  language: string
  title: string | null
  /** Отображаемое имя дорожки */
  name: string | null
  dubGroup: string | null
  format: string
  isDefault: boolean
  /** CID файла в IPFS (для загрузки через gateway) */
  fileCid: string | null
  /** CID шрифтов для ASS субтитров */
  fontCids: string[]
}

/** Шрифт */
export interface MobileFont {
  id: string
  name: string
  fileCid: string | null
}

/** Прогресс просмотра */
export interface MobileWatchProgress {
  currentTime: number
  completed: boolean
  lastWatchedAt: string
}

/** Ответ с информацией о сервере */
export interface MobileServerInfo {
  version: string
  libraryPath: string | null
  animeCount: number
}
