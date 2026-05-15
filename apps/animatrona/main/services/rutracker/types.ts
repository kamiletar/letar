/**
 * Типы для парсера Рутрекера
 */

/** Информация о озвучке/субтитрах */
export interface RutrackerDubGroup {
  /** Название группы озвучки */
  name: string
  /** Тип: дубляж или субтитры */
  type: 'dub' | 'sub'
  /** Язык */
  language: string
  /** Внешние файлы */
  isExternal: boolean
  /** Дополнительные детали */
  details?: string
}

/** Аудиодорожка из MediaInfo */
export interface RutrackerAudioTrack {
  /** Кодек (FLAC, AC3, Opus, AAC) */
  codec: string
  /** Каналы (2.0, 5.1) */
  channels: string
  /** Язык */
  language: string
  /** Битрейт в kbps */
  bitrate: number
}

/** Техническая информация из MediaInfo */
export interface RutrackerMediaInfo {
  /** Видеокодек (x264, HEVC, AV1) */
  videoCodec: string
  /** Глубина цвета */
  bitDepth: number
  /** Ширина в пикселях */
  width: number
  /** Высота в пикселях */
  height: number
  /** Частота кадров */
  fps: number
  /** Битрейт видео в kbps */
  videoBitrate: number
  /** Аудиодорожки */
  audioTracks: RutrackerAudioTrack[]
}

/** Внешние ссылки из поста */
export interface RutrackerExternalLinks {
  shikimoriUrl?: string
  shikimoriId?: number
  anidbUrl?: string
  worldArtUrl?: string
  malUrl?: string
  malId?: number
}

/** Результат парсинга страницы раздачи */
export interface RutrackerTorrentInfo {
  /** URL страницы */
  url: string
  /** ID темы */
  topicId: number

  // Из заголовка (topic-title)
  /** Название на русском */
  nameRu: string
  /** Оригинальное название */
  nameOriginal: string
  /** Тип (TV, TV+Special, Movie, OVA) */
  type?: string
  /** Информация об эпизодах ("37 из 37") */
  episodeInfo?: string
  /** Количество эпизодов */
  episodeCount?: number
  /** Языки из заголовка */
  languages: string[]
  /** Год выпуска */
  year?: number
  /** Жанры */
  genres: string[]
  /** Тип исходника (BDRip, WEB-DL, HDTVRip) */
  sourceType?: string
  /** Разрешение (1080p, 720p) */
  resolution?: string

  // Из тела поста
  /** Страна */
  country?: string
  /** Длительность */
  duration?: string
  /** Режиссёр */
  director?: string
  /** Студия */
  studio?: string
  /** Описание */
  description?: string
  /** Качество */
  quality?: string
  /** Релиз-группа */
  releaseGroup?: string
  /** Тип релиза */
  releaseType?: string

  /** Озвучки */
  dubGroups: RutrackerDubGroup[]

  /** Техническая информация из MediaInfo */
  mediaInfo?: RutrackerMediaInfo

  /** Внешние ссылки */
  externalLinks: RutrackerExternalLinks

  /** Магнет-ссылка */
  magnetLink: string
  /** URL постера */
  posterUrl?: string
  /** Размер раздачи (текст, напр. "891 MB") */
  sizeText?: string

  /** Список файлов (из спойлера) */
  fileList?: string[]
}
