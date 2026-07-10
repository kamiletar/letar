/**
 * Типы для параллельного транскодирования
 *
 * Архитектура:
 * - VideoPool: 2 параллельных NVENC энкодера (RTX 5080 Dual Encoders)
 * - AudioPool: все ядра CPU для параллельного кодирования аудио
 */

import type { AudioTranscodeVBROptions, TranscodeProgressExtended, VideoTranscodeOptions } from '../types'

// === Статусы задач ===

/** Статус задачи в пуле */
export type PoolTaskStatus = 'queued' | 'running' | 'completed' | 'error' | 'cancelled'

// === Видео задачи ===

/** Задача для видео-пула (GPU) */
export interface VideoPoolTask {
  /** Уникальный ID задачи */
  id: string
  /** ID элемента импорта (эпизод) */
  queueItemId: string
  /** ID элемента в очереди импорта (аниме) — для группировки статистики */
  animeQueueItemId?: string
  /** ID эпизода в БД */
  episodeId: string
  /** Путь к входному файлу */
  inputPath: string
  /** Путь к выходному файлу */
  outputPath: string
  /** Опции кодирования */
  options: VideoTranscodeOptions
  /** Статус задачи */
  status: PoolTaskStatus
  /** Прогресс кодирования */
  progress: TranscodeProgressExtended | null
  /** Сообщение об ошибке */
  error?: string
  /** Индекс GPU (0 или 1 для dual encoder) */
  gpuIndex?: number
  /**
   * FPS исходного видео (из probe)
   * Используется для точного расчёта прогресса — FFmpeg выдаёт искажённый fps при multipass/lookahead
   */
  sourceFps?: number
  /**
   * Использовать CPU кодирование (libsvtav1) вместо GPU (NVENC)
   * Устанавливается автоматически если NVENC crash на этапе VMAF
   */
  useCpuFallback?: boolean
  /**
   * Принудительно использовать CPU кодирование (из настроек профиля)
   * Если true — сразу использовать libsvtav1, не пробовать NVENC
   */
  preferCpu?: boolean
  /**
   * Время начала кодирования (Date.now())
   * Используется для расчёта elapsed time в UI
   */
  startedAt?: number
  /**
   * Полная FFmpeg команда
   * Сохраняется для отображения в диалоге "Настройки кодирования"
   */
  ffmpegCommand?: string
  /**
   * Время транскодирования в миллисекундах
   * Вычисляется при завершении задачи: Date.now() - startedAt
   */
  transcodeDurationMs?: number
  /**
   * Количество активных GPU потоков в момент кодирования
   * Показывает загрузку dual encoder'ов
   */
  activeGpuWorkers?: number
  /**
   * Предвычисленный -vf фильтр Anime4K
   * Заполняется в runTask() после probe, используется в buildFFmpegArgs()
   */
  anime4kFilter?: string
  /** field_order источника: tt/bb = interlaced, progressive = прогрессивное */
  sourceFieldOrder?: string
  /** Размер исходного видеопотока в байтах (без аудио/сабов), из демукса */
  sourceStreamSize?: number
  /** Размер исходного видеопотока (байты), захватывается при завершении — fallback на размер всего файла если sourceStreamSize не передан */
  sourceSize?: number
  /** Размер транскодированного видео (байты), захватывается при завершении */
  transcodedSize?: number
}

// === Аудио задачи ===

/** Задача для аудио-пула (CPU) */
export interface AudioPoolTask {
  /** Уникальный ID задачи */
  id: string
  /** ID элемента импорта (эпизод) */
  queueItemId: string
  /** ID элемента в очереди импорта (аниме) — для группировки статистики */
  animeQueueItemId?: string
  /** ID эпизода в БД */
  episodeId: string
  /** ID аудиодорожки в БД */
  trackId: string
  /** Индекс дорожки в исходном файле */
  trackIndex: number
  /** Путь к входному файлу */
  inputPath: string
  /** Путь к выходному файлу */
  outputPath: string
  /** Опции кодирования */
  options: AudioTranscodeVBROptions
  /** Статус задачи */
  status: PoolTaskStatus
  /** Прогресс кодирования */
  progress: TranscodeProgressExtended | null
  /** Сообщение об ошибке */
  error?: string
  /**
   * Использовать маппинг потока (-map 0:a:trackIndex)
   * true если inputPath — исходный MKV файл
   */
  useStreamMapping?: boolean
  /**
   * Смещение синхронизации в миллисекундах (для донорских дорожек)
   * Положительное = донор опережает (обрезать начало через -ss)
   * Отрицательное = донор отстаёт (добавить тишину через adelay)
   */
  syncOffset?: number
  /** Внешний аудиофайл (не из MKV контейнера) */
  isExternal?: boolean
  /** Название дорожки (для внешних) */
  title?: string
  /** Язык (для внешних) */
  language?: string
  /**
   * Режим passthrough — копировать аудио без транскодирования
   * Используется для AAC/MP3 с хорошим качеством (≤256kbps)
   */
  passthrough?: boolean
  /**
   * Оригинальный кодек (для passthrough режима)
   * Нужен чтобы не менять codec на 'aac' в БД
   */
  originalCodec?: string
}

// === Элемент импорта ===

/** Статус элемента импорта */
export type ImportItemStatus = 'pending' | 'processing' | 'completed' | 'error' | 'cancelled'

/** Элемент очереди импорта (эпизод) */
export interface ImportQueueItem {
  /** Уникальный ID элемента */
  id: string
  /** ID эпизода в БД */
  episodeId: string
  /** Статус элемента */
  status: ImportItemStatus
  /** Видео-задача */
  videoTask: VideoPoolTask
  /** Аудио-задачи */
  audioTasks: AudioPoolTask[]
  /** Флаг завершения видео */
  videoCompleted?: boolean
  /** Время добавления */
  addedAt: string
}

// === Прогресс ===

/** Статистика пула */
export interface PoolStats {
  /** Активных задач (выполняются прямо сейчас) */
  active: number
  /** В очереди (ожидают выполнения) */
  queued: number
  /** Завершённых задач */
  completed: number
  /** Всего задач */
  total: number
  /** Задачи с ошибками */
  errors: number
}

/** Статистика текущего элемента (per-anime) */
export interface CurrentItemStats {
  /** ID текущего элемента */
  itemId: string | null
  /** Видео: всего */
  videoTotal: number
  /** Видео: завершено */
  videoCompleted: number
  /** Аудио: всего */
  audioTotal: number
  /** Аудио: завершено */
  audioCompleted: number
}

/** Агрегированный прогресс для UI */
export interface AggregatedProgress {
  /** Общий процент всех задач (0-100) */
  totalPercent: number
  /** Средний процент активных видео-задач (0-100) */
  currentVideoPercent: number
  /** Статистика видео-пула */
  videoTasks: PoolStats & {
    /** Активные видео-задачи с прогрессом */
    tasks: VideoPoolTask[]
  }
  /** Статистика аудио-пула */
  audioTasks: PoolStats & {
    /** Активные аудио-задачи с прогрессом */
    tasks: AudioPoolTask[]
  }
  /** Элементы импорта */
  items: ImportQueueItem[]
  /** Статистика текущего элемента (опционально) */
  currentItemStats?: CurrentItemStats
}

// === Batch импорт ===

/** Входные данные для видео при batch-импорте */
export interface BatchVideoInput {
  /** Путь к входному файлу */
  inputPath: string
  /** Путь к выходному файлу */
  outputPath: string
  /** Опции кодирования */
  options: VideoTranscodeOptions
  /** Использовать CPU fallback (из VMAF результата) */
  useCpuFallback?: boolean
  /** Размер исходного видеопотока в байтах (без аудио/сабов) — из демукса */
  sourceStreamSize?: number
}

/** Входные данные для аудиодорожки при batch-импорте */
export interface BatchAudioTrackInput {
  /** ID дорожки в БД (может быть временным) */
  trackId: string
  /** Индекс дорожки в исходном файле */
  trackIndex: number
  /** Путь к входному файлу */
  inputPath: string
  /** Путь к выходному файлу */
  outputPath: string
  /** Опции кодирования */
  options: AudioTranscodeVBROptions
  /**
   * Использовать маппинг потока (-map 0:a:N)
   * true если inputPath — исходный MKV файл (кодируем конкретную дорожку)
   * false если inputPath — извлечённый .mka файл (весь файл = одна дорожка)
   */
  useStreamMapping?: boolean
  /**
   * Смещение синхронизации в миллисекундах (для донорских дорожек)
   * Положительное = донор опережает (обрезать начало через -ss)
   * Отрицательное = донор отстаёт (добавить тишину через adelay)
   */
  syncOffset?: number
  /** Внешний аудиофайл (не из MKV контейнера) */
  isExternal?: boolean
  /** Название дорожки (для внешних) */
  title?: string
  /** Язык (для внешних) */
  language?: string
  /**
   * Режим passthrough — копировать аудио без транскодирования
   * Используется для AAC/MP3 с хорошим качеством (≤256kbps)
   */
  passthrough?: boolean
  /**
   * Оригинальный кодек (для passthrough режима)
   * Нужен чтобы не менять codec на 'aac' в БД
   */
  originalCodec?: string
}

/** Элемент для batch-импорта */
export interface BatchImportItem {
  /** Уникальный ID элемента */
  id: string
  /** ID эпизода в БД */
  episodeId: string
  /** ID элемента в очереди импорта (аниме) — для группировки статистики */
  animeQueueItemId?: string
  /** Видео */
  video: BatchVideoInput
  /** Аудиодорожки */
  audioTracks: BatchAudioTrackInput[]
}

/** Конфигурация для batch-импорта */
export interface BatchImportConfig {
  /** Макс. количество параллельных аудио-задач (по умолчанию = кол-во ядер CPU) */
  audioMaxConcurrent?: number
}

// === Конфигурация ===

/** Конфигурация пулов */
export interface PoolConfig {
  /** Максимум параллельных видео-задач (обычно 2 для dual encoder) */
  videoMaxConcurrent: number
  /** Максимум параллельных аудио-задач (обычно = кол-во ядер CPU) */
  audioMaxConcurrent: number
}

// === События ===

/** События от ParallelTranscodeManager */
export interface ParallelTranscodeEvents {
  /** Агрегированный прогресс */
  aggregatedProgress: (progress: AggregatedProgress) => void
  /** Видео-задача завершена */
  videoCompleted: (itemId: string, episodeId: string, outputPath: string) => void
  /** Аудио-дорожка завершена */
  audioTrackCompleted: (
    trackId: string,
    outputPath: string,
    episodeId: string,
    passthrough?: boolean,
    originalCodec?: string
  ) => void
  /** Элемент импорта завершён (все видео и аудио готовы) */
  itemCompleted: (itemId: string, episodeId: string) => void
  /** Ошибка в задаче */
  taskError: (taskId: string, error: string) => void
  /** Глобальная пауза */
  paused: () => void
  /** Возобновление */
  resumed: () => void
}
