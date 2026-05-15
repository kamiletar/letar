/**
 * Типы для экспорта сериала в MKV
 */

/** Тип сезона для умных паттернов */
export type SeasonType = 'TV' | 'OVA' | 'ONA' | 'MOVIE' | 'SPECIAL'

/** Паттерн именования файлов */
export type NamingPattern =
  // Legacy patterns (для обратной совместимости)
  | '[{Anime}] - S{ss}E{nn} - {Episode}'
  | '{Anime} - {nn}'
  | 'S{ss}E{nn} - {Episode}'
  | '{Anime} - S{ss}E{nn}'
  // Новые паттерны (год в начале)
  | '{Year} - {Anime} - S{ss}E{nn}'
  | '{Year} - {Anime}'
  | '{Year} - {Anime} - OVA{nn}'
  | '{Year} - {Anime} - SP{nn}'

/** Конфигурация экспорта сериала */
export interface SeriesExportConfig {
  /** ID аниме */
  animeId: string
  /** ID выбранных аудиодорожек (по language + title) */
  selectedAudioTrackKeys: string[]
  /** ID выбранных субтитров (по language + title) */
  selectedSubtitleTrackKeys: string[]
  /** Папка назначения */
  outputDir: string
  /** Паттерн именования файлов */
  namingPattern: NamingPattern
  /** Информация об аниме для именования */
  animeInfo: {
    name: string
    year?: number
  }
  /** Франшиза (для структуры папок) */
  franchise?: string
  /** Тип сезона (для умных паттернов) */
  seasonType?: SeasonType
  /** Создавать структуру папок */
  createFolderStructure?: boolean
  /** Открыть папку после экспорта */
  openFolderAfterExport?: boolean
}

/** Прогресс экспорта одного эпизода */
export interface EpisodeExportProgress {
  /** ID эпизода */
  episodeId: string
  /** Номер эпизода */
  episodeNumber: number
  /** Номер сезона */
  seasonNumber: number
  /** Статус экспорта */
  status: 'pending' | 'processing' | 'completed' | 'error' | 'skipped'
  /** Процент выполнения (0-100) */
  percent: number
  /** Текст ошибки */
  error?: string
  /** Путь к выходному файлу (после завершения) */
  outputPath?: string
}

/** Агрегированный прогресс экспорта сериала */
export interface SeriesExportProgress {
  /** Общее количество эпизодов */
  totalEpisodes: number
  /** Количество завершённых эпизодов */
  completedEpisodes: number
  /** Индекс текущего эпизода (0-based) */
  currentEpisodeIndex: number
  /** Прогресс по каждому эпизоду */
  episodes: EpisodeExportProgress[]
  /** Статус экспорта */
  status: 'idle' | 'processing' | 'completed' | 'cancelled' | 'error'
  /** Текст ошибки (если есть) */
  error?: string
}

/** Результат экспорта сериала */
export interface ExportResult {
  /** Успешность операции */
  success: boolean
  /** Пути к экспортированным файлам */
  exportedFiles: string[]
  /** Пропущенные эпизоды (нет готовых дорожек) */
  skippedEpisodes: Array<{ episodeId: string; reason: string }>
  /** Эпизоды с ошибками */
  failedEpisodes: Array<{ episodeId: string; error: string }>
}

/** Информация о дорожке для UI выбора */
export interface TrackSelectionInfo {
  /** Уникальный ключ (language + title) */
  key: string
  /** Язык */
  language: string
  /** Название */
  title: string
  /** Кодек (для аудио) */
  codec?: string
  /** Количество каналов (для аудио) */
  channels?: string
  /** Формат (для субтитров: ass, srt, vtt) */
  format?: string
  /** Количество эпизодов с этой дорожкой */
  episodeCount: number
  /** Все эпизоды имеют готовую дорожку (COMPLETED/SKIPPED) */
  allReady: boolean
}

/** Данные для диалога экспорта */
export interface ExportDialogData {
  /** Доступные аудиодорожки */
  audioTracks: TrackSelectionInfo[]
  /** Доступные субтитры */
  subtitleTracks: TrackSelectionInfo[]
  /** Общее количество эпизодов */
  totalEpisodes: number
  /** Количество эпизодов с готовым видео */
  readyEpisodes: number
}
