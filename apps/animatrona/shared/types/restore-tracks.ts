/**
 * Типы для восстановления дорожек (main process архитектура)
 *
 * RestoreTracksManager в main process управляет очередью,
 * renderer только подписывается на события прогресса.
 */

/** Тип задачи восстановления */
export type RestoreTaskType = 'audio-transcode' | 'audio-copy' | 'subtitle-extract' | 'subtitle-copy' | 'font'

/** Метаданные дорожки для восстановления */
export interface RestoreTrackInfo {
  language: string
  title: string
  codec: string
  format?: string
  channels?: number
  bitrate?: number
  dubGroup?: string
  isExternal: boolean
  filePath?: string
  matchedFonts?: Array<{ name: string; path: string }>
}

/** Задача восстановления одной дорожки */
export interface RestoreTask {
  id: string
  type: RestoreTaskType
  /** 'audio' или 'subtitle' — для UI и DB */
  trackType: 'audio' | 'subtitle'
  episodeId: string
  /** Путь к донорскому MKV */
  donorPath: string
  /** Индекс потока среди дорожек своего типа (для 0:a:N / 0:s:N) */
  streamIndex: number
  /** Метаданные дорожки */
  trackInfo: RestoreTrackInfo
  /** Путь к папке эпизода (для temp файлов внутри библиотеки) */
  episodeDir: string

  // Состояние (обновляется менеджером)
  status: 'queued' | 'running' | 'completed' | 'error' | 'cancelled'
  progress: number
  phase: 'waiting' | 'extract' | 'transcode' | 'copy' | 'upload' | 'db' | 'done'
  error?: string
  /** CID загруженного файла в IPFS */
  resultCid?: string
  /** ID созданной записи в БД */
  resultDbId?: string
  /** Timestamp последнего обновления прогресса (для stale detection) */
  lastProgressUpdate: number
  /** Количество retry после зависания */
  retryCount: number
}

/** Задача восстановления шрифтов */
export interface RestoreFontTask {
  id: string
  donorPath: string
  episodeId: string
  /** Имена файлов недостающих шрифтов */
  missingFonts: string[]
  /** ID SubtitleTrack для привязки */
  subtitleTrackIds: string[]
  // Состояние
  status: 'queued' | 'running' | 'completed' | 'error'
  restoredCount: number
  error?: string
}

/** Конфигурация восстановления */
export interface RestoreConfig {
  concurrency: number
  audioBitrate: number
  syncOffset: number
}

/** Агрегированный прогресс восстановления */
export interface RestoreProgress {
  totalPercent: number
  tasks: {
    total: number
    completed: number
    running: number
    queued: number
    errors: number
  }
  fonts: {
    total: number
    restored: number
  }
  addedAudioTracks: number
  addedSubtitleTracks: number
  /** Прогресс каждой задачи (для UI списка) */
  taskDetails: RestoreTaskDetail[]
}

/** Детали задачи для UI */
export interface RestoreTaskDetail {
  id: string
  fileName: string
  phase: RestoreTask['phase']
  percent: number
  status: RestoreTask['status']
  error?: string
  /** Мс с последнего обновления прогресса (для stale индикатора в UI) */
  lastProgressMs?: number
}
