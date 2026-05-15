/**
 * Типы для Web Player экспорта
 */

/**
 * Режим ресурсов в манифесте
 * - embedded: все файлы копируются локально (оффлайн)
 * - referenced: только плеер и манифест, медиа по CID (нужен gateway)
 * - publish: embedded + публикация в IPFS, возвращает root CID
 */
export type WebPlayerResourceMode = 'embedded' | 'referenced' | 'publish'

/** Аудиодорожка в манифесте */
export interface WebPlayerAudioTrack {
  language: string
  title: string
  /** Относительный путь или CID */
  src: string
}

/** Субтитры в манифесте */
export interface WebPlayerSubtitleTrack {
  language: string
  title: string
  format: 'ass' | 'srt' | 'vtt'
  /** Относительный путь или CID */
  src: string
  /** Шрифты для ASS субтитров */
  fonts?: string[]
}

/** Глава эпизода */
export interface WebPlayerChapter {
  start: number
  end: number
  title: string
  type: 'op' | 'ed' | 'content' | 'preview'
}

/** Эпизод в манифесте */
export interface WebPlayerEpisode {
  number: number
  name?: string
  season: number
  /** Длительность в секундах */
  duration: number
  /** Путь или CID видео */
  video: string
  audio: WebPlayerAudioTrack[]
  subtitles: WebPlayerSubtitleTrack[]
  chapters?: WebPlayerChapter[]
}

/** Манифест Web Player */
export interface WebPlayerManifest {
  /** Версия формата манифеста */
  version: 2
  /** Тип контента */
  type: 'anime' | 'movie'

  /** Информация об аниме */
  anime: {
    name: string
    originalName?: string
    year?: number
    /** Относительный путь или CID постера */
    poster?: string
  }

  /** Список эпизодов */
  episodes: WebPlayerEpisode[]

  /** Дефолтные дорожки */
  defaults: {
    /** Ключ аудиодорожки (language:title) */
    audioTrack?: string
    /** Ключ субтитров (language:title) */
    subtitleTrack?: string
  }

  /** Режим ресурсов */
  resourceMode: WebPlayerResourceMode

  /** Метаданные генерации */
  createdAt: string
  generatorVersion: string
}

/** Опции экспорта Web Player */
export interface WebExportOptions {
  /** Режим: embedded (копировать файлы) или referenced (только CID) */
  mode: WebPlayerResourceMode
  /** Номера эпизодов для экспорта */
  episodes: number[]
  /** Ключи аудиодорожек */
  audioTracks: string[]
  /** Ключи субтитров */
  subtitleTracks: string[]
  /** Дефолтные дорожки */
  defaults: {
    audio?: string
    subtitle?: string
  }
  /** Папка назначения (не требуется для режима publish) */
  outputDir?: string
}

/** Прогресс экспорта Web Player */
export interface WebExportProgress {
  /** Текущий этап */
  stage: 'preparing' | 'copying-assets' | 'generating-manifest' | 'bundling-player' | 'publishing' | 'done'
  /** Общий прогресс 0-100 */
  percent: number
  /** Текущий файл */
  currentFile?: string
  /** Сообщение */
  message: string
}

/** Результат экспорта Web Player */
export interface WebExportResult {
  success: boolean
  /** Путь к выходной директории */
  outputPath?: string
  /** Root CID (если опубликовано в IPFS) */
  rootCid?: string
  /** URL для просмотра через gateway */
  gatewayUrl?: string
  /** Ошибка */
  error?: string
}
