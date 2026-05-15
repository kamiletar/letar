/**
 * Типы для очереди экспорта
 */

import type { NamingPattern, SeasonType } from './export'

/** Тип экспорта */
export type ExportType = 'mkv' | 'web-player'

/** Статус задачи экспорта */
export type ExportTaskStatus =
  | 'pending' // В очереди
  | 'fetching' // Загрузка из IPFS
  | 'encoding' // FFmpeg обработка
  | 'completed' // Завершено
  | 'failed' // Ошибка
  | 'cancelled' // Отменено
  | 'paused' // Приостановлено

/** Прогресс задачи экспорта */
export interface ExportTaskProgress {
  /** Текущий эпизод (1-based) */
  currentEpisode: number
  /** Всего эпизодов */
  totalEpisodes: number
  /** Прогресс загрузки из IPFS (0-100) */
  fetchProgress: number
  /** Прогресс FFmpeg (0-100) */
  encodeProgress: number
  /** Загружено байт */
  bytesDownloaded: number
  /** Скорость загрузки */
  speed: string
  /** Примерное время до завершения */
  eta: string
}

/** Данные эпизода для экспорта (передаются из renderer) */
export interface QueueEpisodeExportData {
  /** ID эпизода */
  id: string
  /** Номер эпизода */
  number: number
  /** Номер сезона */
  seasonNumber: number
  /** Название эпизода */
  name?: string | null
  /** Длительность в миллисекундах */
  durationMs?: number
  /** CID транскодированного видео в IPFS */
  videoCid: string
  /** Аудиодорожки */
  audioTracks: Array<{
    language: string
    title: string | null
    transcodedCid: string
    streamIndex: number
  }>
  /** Субтитры */
  subtitleTracks: Array<{
    language: string
    title: string | null
    format?: string | null
    fileCid: string
    fontCids: string[]
  }>
  /** CID манифеста для загрузки глав из IPFS */
  manifestCid?: string | null
  /** Главы эпизода (если уже загружены) */
  chapters?: Array<{ startMs: number; endMs: number; title?: string; type?: string }>
}

/** Конфигурация экспорта для очереди */
export interface QueueExportConfig {
  /** Название аниме */
  animeName: string
  /** Оригинальное название (японское) */
  originalName?: string | null
  /** Год */
  year?: number
  /** Путь к папке назначения */
  outputDir: string
  /** Паттерн именования */
  namingPattern: NamingPattern
  /** CID постера в IPFS */
  posterCid?: string | null
  /** Данные эпизодов */
  episodes: QueueEpisodeExportData[]
  /** Выбранные ключи аудиодорожек (language + title) в порядке, указанном пользователем */
  selectedAudioKeys: string[]
  /** Выбранные ключи субтитров (language + title) в порядке, указанном пользователем */
  selectedSubtitleKeys: string[]
  /** Индекс аудиодорожки по умолчанию (0-based среди selectedAudioKeys) */
  defaultAudioIndex?: number
  /** Индекс субтитров по умолчанию (0-based среди selectedSubtitleKeys), undefined = нет default */
  defaultSubtitleIndex?: number
  /** Франшиза (для структуры папок) */
  franchise?: string
  /** Тип сезона (для умных паттернов) */
  seasonType?: SeasonType
  /** Создавать структуру папок */
  createFolderStructure?: boolean
  /** Открыть папку после экспорта */
  openFolderAfterExport?: boolean
}

/** Задача экспорта */
export interface ExportTask {
  /** Уникальный ID задачи */
  id: string
  /** Тип экспорта */
  type: ExportType
  /** ID аниме */
  animeId: string
  /** Название аниме (для отображения) */
  animeName: string
  /** Номера эпизодов для экспорта */
  episodes: number[]
  /** Текущий статус */
  status: ExportTaskStatus
  /** Прогресс выполнения */
  progress: ExportTaskProgress
  /** Путь к выходному файлу/директории */
  outputPath: string
  /** Конфигурация экспорта (полные данные для выполнения) */
  config: QueueExportConfig
  /** Сообщение об ошибке (если failed) */
  error?: string
  /** Когда задача создана */
  createdAt: string
  /** Когда задача начала выполняться */
  startedAt?: string
  /** Когда задача завершилась */
  completedAt?: string
  /** Приоритет (меньше = выше приоритет) */
  priority: number
  /** Количество попыток retry */
  retryCount: number
}

/** Данные для создания задачи экспорта */
export interface ExportTaskCreateData {
  type: ExportType
  animeId: string
  animeName: string
  /** Полная конфигурация экспорта */
  config: QueueExportConfig
  /** Приоритет (по умолчанию 10) */
  priority?: number
}

/** Настройки очереди экспорта */
export interface ExportQueueSettings {
  /** Максимум параллельных задач */
  maxConcurrent: number
  /** Автоматический retry при ошибках сети */
  autoRetry: boolean
  /** Максимум попыток retry */
  maxRetries: number
  /** Показывать системные уведомления */
  showNotifications: boolean
}

/** Результат операции с очередью */
export interface ExportQueueResult<T = void> {
  success: boolean
  data?: T
  error?: string
}
