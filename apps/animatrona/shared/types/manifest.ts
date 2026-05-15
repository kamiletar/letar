/**
 * Типы для манифеста эпизода (desktop)
 *
 * Реэкспортирует shared типы из @letar/animatrona-types
 * и добавляет desktop-specific типы для генерации манифестов.
 */

// ─── Реэкспорт shared типов ────────────────────────────────────────

export { MANIFEST_VERSION } from '@letar/animatrona-types'
export type {
  ChaptersDocument,
  EncodingDocument,
  EpisodeManifest,
  ManifestAudioTrack,
  ManifestChapter,
  ManifestChapterType,
  ManifestEncodingInfo,
  ManifestInfo,
  ManifestNavigation,
  ManifestSubtitleFont,
  ManifestSubtitleTrack,
  ManifestThumbnails,
  ManifestVideo,
  ThumbnailsDocument,
} from '@letar/animatrona-types'

// ─── Desktop-specific типы ─────────────────────────────────────────

/** Опционально: данные дорожки из рекомендаций (для передачи dubGroup/language из UI) */
export interface TrackOverride {
  /** Индекс потока (или -1 для внешних) */
  streamIndex: number
  /** Язык (ISO 639-1) */
  language?: string
  /** Группа озвучки/субтитров */
  dubGroup?: string
}

/** Опции для генерации манифеста */
export interface GenerateManifestOptions {
  /** ID эпизода в БД */
  episodeId: string
  /** Путь к видеофайлу */
  videoPath: string
  /** Папка для вывода (манифест + извлечённые файлы) */
  outputDir: string
  /** Информация об аниме */
  animeInfo: import('@letar/animatrona-types').ManifestInfo
  /** Генерировать превью (по умолчанию false) */
  generateThumbnails?: boolean
  /** Переопределения для аудиодорожек (язык, dubGroup из UI) */
  audioTrackOverrides?: TrackOverride[]
  /** Переопределения для субтитров (язык, dubGroup из UI) */
  subtitleTrackOverrides?: TrackOverride[]
}

/** Результат генерации манифеста */
export interface GenerateManifestResult {
  success: boolean
  manifestPath?: string
  manifest?: import('@letar/animatrona-types').EpisodeManifest
  error?: string
}
