/**
 * Общие типы для IPC между main и renderer процессами
 * Единый источник истины — избегаем дублирования
 */

// === Медиа типы ===

/** Информация об аудиодорожке */
export interface AudioTrack {
  /** Путь к входному файлу */
  input: string
  /** Индекс потока в контейнере */
  index: number
  /** Код языка (ru, en, jp, und) */
  language: string
  /** Название дорожки */
  title: string
  /** Кодек */
  codec?: string
  /** Битрейт */
  bitrate?: number
  /** Количество каналов */
  channels?: number
  /** Теги (для извлечения группы/автора) */
  tags?: Record<string, string>
}

/** Информация о субтитрах */
export interface SubtitleTrack {
  /** Путь к файлу субтитров */
  path: string
  /** Индекс потока в контейнере */
  index: number
  /** Кодек/формат (ass, subrip, hdmv_pgs_subtitle) */
  codec: string
  /** Код языка */
  language: string
  /** Название дорожки */
  title: string
  /** Пути к файлам шрифтов */
  fonts: string[]
  /** Теги (для извлечения типа) */
  tags?: Record<string, string>
}

/** Информация о видеодорожке */
export interface VideoTrack {
  /** Путь к файлу */
  path: string
  /** Длительность в секундах */
  duration: number
  /** Ширина */
  width?: number
  /** Высота */
  height?: number
  /** Кодек */
  codec?: string
  /** Битрейт */
  bitrate?: number
  /** Частота кадров */
  fps?: number
  /** Формат пикселей (yuv420p, yuv420p10le, yuv444p10le) */
  pixelFormat?: string
  /** Битность цвета (8, 10, 12) */
  bitDepth?: number
  /** Порядок полей: tt/bb = interlaced, progressive = прогрессивное */
  fieldOrder?: string
  /** Цветовое пространство (bt709, bt2020) */
  colorSpace?: string
  /** Профиль кодека (Main, Main 10, High) */
  profile?: string
}

/** Полная информация о медиафайле */
export interface MediaInfo {
  /** Путь к файлу */
  path: string
  /** Длительность в секундах */
  duration: number
  /** Размер файла в байтах */
  size: number
  /** Формат контейнера */
  format: string
  /** Видеодорожки */
  videoTracks: VideoTrack[]
  /** Аудиодорожки */
  audioTracks: AudioTrack[]
  /** Субтитры */
  subtitleTracks: SubtitleTrack[]
  /** Главы (из MKV контейнера) */
  chapters?: MediaChapter[]
  /** Вложения-шрифты (имена файлов) */
  attachmentFonts?: string[]
}

/** Глава из MKV контейнера */
export interface MediaChapter {
  /** Начало в секундах */
  start: number
  /** Конец в секундах */
  end: number
  /** Название главы */
  title: string
}

// === Транскодирование ===

/** Прогресс транскодирования */
export interface TranscodeProgress {
  /** Процент выполнения (0-100) */
  percent: number
  /** Текущая позиция в секундах */
  currentTime: number
  /** Общая длительность в секундах */
  totalDuration: number
  /** Оставшееся время в секундах */
  eta: number
  /** Текущий этап (video, audio, merge) */
  stage: 'video' | 'audio' | 'merge'
  /** Идентификатор дорожки (путь к файлу) */
  trackId?: string
}

/** Настройки транскодирования видео */
export interface VideoTranscodeOptions {
  /** Видеокодек (av1, hevc, h264) */
  codec: 'av1' | 'hevc' | 'h264'
  /** Использовать GPU (nvenc) или CPU */
  useGpu: boolean
  /** Качество CQ (15-40), меньше = лучше */
  cq: number
  /** Пресет скорости (p1-p7 для GPU, 0-13 для CPU) */
  preset: string
  /** Rate Control режим */
  rateControl?: RateControlType
  /** Макс. битрейт для VBR (Mbps) */
  maxBitrate?: number | null
  /** Tune режим */
  tune?: TuneType
  /** Multipass режим */
  multipass?: MultipassType
  /** Spatial Adaptive Quantization */
  spatialAq?: boolean
  /** Temporal Adaptive Quantization */
  temporalAq?: boolean
  /** AQ Strength (1-15) */
  aqStrength?: number
  /** Lookahead frames (0-250) */
  lookahead?: number | null
  /** Lookahead level (0-3) */
  lookaheadLevel?: number | null
  /** GOP Size (расстояние между ключевыми кадрами) */
  gopSize?: number
  /** B-Ref Mode */
  bRefMode?: BRefModeType
  /** Принудительно 10-bit выход */
  force10Bit?: boolean
  /** Temporal Filter (Blackwell+) */
  temporalFilter?: boolean
  /** Путь к шейдеру Anime4K для апскейла (libplacebo) */
  anime4kShaderPath?: string
  /** Применить hqdn3d денойз перед кодированием */
  denoiseEnabled?: boolean
}

/** Поколение GPU NVIDIA */
export type GpuGeneration = 'blackwell' | 'ada' | 'ampere' | 'turing' | 'none'

/** Информация об оборудовании (GPU + CPU) */
export interface HardwareInfo {
  /** Модель GPU (обратная совместимость) */
  gpuModel: string | null
  /** Модель CPU */
  cpuModel: string
  /** Поколение GPU */
  generation: GpuGeneration
  /** Поддержка AV1 кодирования (Ada+) */
  supportsAv1: boolean
  /** Поддержка UHQ tune (Ada+) */
  supportsUhqTune: boolean
  /** Поддержка Temporal Filter (Blackwell) */
  supportsTemporalFilter: boolean
}

/** Тип Rate Control */
export type RateControlType = 'VBR' | 'CONSTQP' | 'CQ'

/** Тип Tune */
export type TuneType = 'NONE' | 'HQ' | 'UHQ' | 'ULL' | 'LL'

/** Тип Multipass */
export type MultipassType = 'DISABLED' | 'QRES' | 'FULLRES'

/** Тип B-Ref Mode */
export type BRefModeType = 'DISABLED' | 'EACH' | 'MIDDLE'

/**
 * Расширенный профиль кодирования
 * Соответствует модели EncodingProfile в schema.zmodel
 */
export interface EncodingProfileOptions {
  /** ID профиля */
  id?: string
  /** Название профиля */
  name: string
  /** Видеокодек (AV1, HEVC, H264) */
  codec: 'AV1' | 'HEVC' | 'H264'
  /** Использовать GPU (nvenc) или CPU */
  useGpu: boolean
  /** Rate Control режим */
  rateControl: RateControlType
  /** Качество CQ/CRF (15-40) */
  cq: number
  /** Макс. битрейт для VBR (Mbps) */
  maxBitrate?: number | null
  /** Пресет скорости (p1-p7 для GPU) */
  preset: string
  /** Tune режим */
  tune: TuneType
  /** Multipass режим */
  multipass: MultipassType
  /** Spatial Adaptive Quantization */
  spatialAq: boolean
  /** Temporal Adaptive Quantization */
  temporalAq: boolean
  /** AQ Strength (1-15) */
  aqStrength: number
  /** Lookahead frames (0-250) */
  lookahead?: number | null
  /** Lookahead level (0-3) */
  lookaheadLevel?: number | null
  /** GOP Size (расстояние между ключевыми кадрами) */
  gopSize: number
  /** B-Ref Mode */
  bRefMode: BRefModeType
  /** Принудительно 10-bit выход */
  force10Bit: boolean
  /** Temporal Filter (Blackwell+) */
  temporalFilter: boolean
  /** Deband фильтр (убирает banding в градиентах) */
  deband?: boolean
}

/** Настройки транскодирования аудио (CBR) */
export interface AudioTranscodeOptions {
  /** Битрейт в kbps */
  bitrate: number
  /** Частота дискретизации */
  sampleRate: number
  /** Количество каналов */
  channels: number
  /** Смещение синхронизации в мс (>0 = донор опережает, <0 = донор отстаёт) */
  syncOffset?: number
  /** Индекс аудиопотока в контейнере (для кодирования напрямую из MKV без demux) */
  streamIndex?: number
}

/** Настройки VBR транскодирования аудио */
export interface AudioTranscodeVBROptions {
  /** Target битрейт в kbps (VBR будет стремиться к нему) */
  targetBitrate: number
  /** Частота дискретизации (опционально, по умолчанию исходная) */
  sampleRate?: number
  /** Количество каналов (опционально, по умолчанию исходное) */
  channels?: number
}

/** Результат транскодирования аудио */
export interface AudioTranscodeResult {
  /** Успешность операции */
  success: boolean
  /** Путь к выходному файлу */
  outputPath?: string
  /** Размер выходного файла в байтах */
  outputSize?: number
  /** Сообщение об ошибке */
  error?: string
}

/** Глава для экспорта в MKV */
export interface MergeChapter {
  /** Время начала в миллисекундах */
  startMs: number
  /** Время конца в миллисекундах */
  endMs: number
  /** Название главы */
  title: string
}

/** Конфигурация для мержа */
export interface MergeConfig {
  /** Путь к перекодированному видео */
  videoPath: string
  /** Оригинальные аудиодорожки из видеофайла */
  originalAudio: AudioTrack[]
  /** Внешние аудиодорожки */
  externalAudio: Array<{
    path: string
    language: string
    title: string
  }>
  /** Субтитры */
  subtitles: SubtitleTrack[]
  /** Путь для выходного файла */
  outputPath: string
  /** Главы эпизода (опционально) */
  chapters?: MergeChapter[]
  /** Путь к постеру/обложке (опционально) */
  posterPath?: string
  /** Индекс аудиодорожки по умолчанию (0-based среди всех аудио) */
  defaultAudioIndex?: number
  /** Индекс субтитров по умолчанию (0-based среди всех субтитров), -1 = нет default */
  defaultSubtitleIndex?: number
}

/** Задача транскодирования */
export interface TranscodeJob {
  /** Уникальный ID задачи */
  id: string
  /** Путь к исходному видео */
  sourcePath: string
  /** Папка для вывода */
  outputDir: string
  /** Настройки видео */
  videoOptions: VideoTranscodeOptions
  /** Настройки аудио */
  audioOptions: AudioTranscodeOptions
  /** Статус */
  status: 'queued' | 'processing' | 'completed' | 'error'
  /** Сообщение об ошибке */
  error?: string
}

// === IPC Response типы ===

/** Результат операции */
export interface OperationResult {
  success: boolean
  message?: string
  error?: string
}

/** Результат кодирования сэмпла */
export interface SampleResult {
  success: boolean
  outputPath: string
  encodingTime: number
  outputSize: number
  error?: string
}

/** Фильтры для диалога выбора файла */
export interface FileFilter {
  name: string
  extensions: string[]
}

// === Demux типы ===

/** Опции демультиплексирования */
export interface DemuxOptions {
  /** Извлекать субтитры */
  extractSubs?: boolean
  /** Извлекать главы (chapters) */
  extractChapters?: boolean
  /**
   * Пропустить извлечение видеопотока
   * Оптимизация: транскодирование может работать напрямую с исходником
   */
  skipVideo?: boolean
  /**
   * Режим извлечения аудио:
   * - 'all' — извлекать все дорожки (по умолчанию, обратная совместимость)
   * - 'smart' — извлекать только дорожки которые НЕ нужно кодировать
   *   (AAC ≤256kbps, MP3 любой) → ремукс в m4a/mp3
   *   Остальные (FLAC, Opus, высокий AAC) → не извлекать, кодировать из исходника
   */
  audioExtractMode?: 'all' | 'smart'
  /** Колбэк прогресса демукса: fraction 0..1 */
  onProgress?: (fraction: number) => void
}

/** Информация об извлечённом видеопотоке */
export interface DemuxedVideo {
  /** Путь к извлечённому файлу */
  path: string
  /** Кодек (h264, hevc, av1) */
  codec: string
  /** Ширина */
  width: number
  /** Высота */
  height: number
  /** Длительность в секундах */
  duration: number
  /** Размер файла в байтах */
  size: number
  /** Частота кадров */
  fps?: number
  /** Битрейт */
  bitrate?: number
  /** Битность цвета (8, 10, 12) */
  bitDepth?: number
}

/** Информация об извлечённой аудиодорожке */
export interface DemuxedAudio {
  /**
   * Путь к извлечённому файлу
   * null если дорожка не была извлечена (будет кодироваться напрямую из sourceFile)
   */
  path: string | null
  /** Индекс в исходном контейнере */
  index: number
  /** Кодек (aac, opus, flac) */
  codec: string
  /** Язык */
  language: string
  /** Название дорожки */
  title: string
  /** Количество каналов */
  channels: number
  /** Битрейт в bps */
  bitrate?: number
  /** Длительность в секундах */
  duration: number
  /** Размер файла в байтах (0 если не извлечено) */
  size: number
  /**
   * Путь к исходному файлу (MKV)
   * Используется когда path=null — для кодирования напрямую из исходника
   */
  sourceFile?: string
}

/** Информация об извлечённых субтитрах */
export interface DemuxedSubtitle {
  /** Путь к извлечённому файлу */
  path: string
  /** Индекс в исходном контейнере */
  index: number
  /** Формат (ass, srt, vtt) */
  format: string
  /** Язык */
  language: string
  /** Название дорожки */
  title: string
  /** Размер файла в байтах */
  size: number
}

/** Глава (chapter) */
export interface Chapter {
  /** Начало в секундах */
  start: number
  /** Конец в секундах */
  end: number
  /** Название главы */
  title: string
}

/** Метаданные файла */
export interface DemuxedMetadata {
  /** Путь к metadata.json */
  path: string
  /** Формат контейнера */
  container: string
  /** Общая длительность */
  totalDuration: number
  /** Общий размер исходного файла */
  totalSize: number
  /** Главы */
  chapters: Chapter[]
  /** Теги контейнера */
  tags: Record<string, string>
  /** Сырой вывод ffprobe */
  ffprobeRaw: unknown
}

/** Результат демультиплексирования */
export interface DemuxResult {
  /** Успешность операции */
  success: boolean
  /** Путь к исходному файлу */
  source: string
  /** Папка с результатами */
  outputDir: string
  /** Извлечённый видеопоток */
  video: DemuxedVideo | null
  /** Извлечённые аудиодорожки */
  audioTracks: DemuxedAudio[]
  /** Извлечённые субтитры */
  subtitles: DemuxedSubtitle[]
  /** Папка с извлечёнными шрифтами (attachments из MKV) */
  fontsDir: string | null
  /** Метаданные */
  metadata: DemuxedMetadata
  /** Сообщение об ошибке */
  error?: string
}

// === Очередь транскодирования ===

/** Статус элемента очереди */
export type QueueItemStatus =
  | 'pending' // Ожидает
  | 'analyzing' // Анализ FFprobe
  | 'ready' // Готов к транскодированию
  | 'transcoding' // В процессе
  | 'paused' // На паузе
  | 'completed' // Завершён
  | 'cancelled' // Отменён пользователем
  | 'error' // Ошибка
  | 'skipped' // Пропущен (не нужно транскодировать)

/** Расширенный прогресс транскодирования (с данными FFmpeg) */
export interface TranscodeProgressExtended extends TranscodeProgress {
  /** Кадров в секунду (текущая скорость FFmpeg) */
  fps?: number
  /** История FPS (последние N значений) для sparkline графика */
  fpsHistory?: number[]
  /** Скорость относительно реального времени (1.0 = realtime, 2.0 = 2x faster) */
  speed?: number
  /** Текущий битрейт выхода (kbps) */
  bitrate?: number
  /** Текущий размер выходного файла (bytes) */
  outputSize?: number
  /** Прошло времени с начала (ms) */
  elapsedTime?: number
  /** Время начала транскодирования (ISO string) */
  startedAt?: string
  /** Размер входного файла (bytes) */
  inputSize?: number
  /** Текущий кадр */
  currentFrame?: number
  /** Общее количество кадров */
  totalFrames?: number
}

/** Рекомендация для дорожки */
export interface TrackRecommendation {
  /** Рекомендуемое действие */
  action: 'transcode' | 'skip' | 'copy'
  /** Причина рекомендации */
  reason: string
  /** Примерный размер после обработки (bytes) */
  estimatedSize?: number
}

/** Настройки для конкретного файла в очереди */
export interface PerFileTranscodeSettings {
  /** Настройки видео (null = не транскодировать видео) */
  videoOptions?: Partial<VideoTranscodeOptions> | null
  /** Настройки аудио (null = не транскодировать аудио) */
  audioOptions?: Partial<AudioTranscodeOptions> | null
  /** Пропустить транскодирование полностью */
  skipTranscode?: boolean
  /** Рекомендации для дорожек (заполняется после анализа) */
  trackRecommendations?: {
    video: TrackRecommendation
    audio: Record<number, TrackRecommendation>
  }
}

/** Элемент очереди транскодирования */
export interface QueueItem {
  /** Уникальный идентификатор */
  id: string
  /** Путь к исходному файлу */
  filePath: string
  /** Имя файла (для отображения) */
  fileName: string
  /** Статус элемента */
  status: QueueItemStatus
  /** Приоритет (меньше = выше приоритет) */
  priority: number
  /** Прогресс транскодирования */
  progress?: TranscodeProgressExtended
  /** Настройки для этого файла */
  settings?: PerFileTranscodeSettings
  /** Сообщение об ошибке */
  error?: string
  /** Путь к папке с результатами */
  outputPath?: string
  /** Время добавления в очередь (ISO string) */
  addedAt: string
  /** Результат demux (заполняется после анализа) */
  demuxResult?: DemuxResult
}

/** События очереди транскодирования */
export interface TranscodeQueueEvents {
  /** Прогресс элемента очереди */
  progress: (id: string, progress: TranscodeProgressExtended) => void
  /** Изменение статуса элемента */
  statusChange: (id: string, status: QueueItemStatus, error?: string) => void
  /** Изменение всей очереди (порядок, добавление, удаление) */
  queueChange: (queue: QueueItem[]) => void
}
