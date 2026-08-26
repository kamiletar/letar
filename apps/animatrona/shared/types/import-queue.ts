/**
 * Типы для очереди импорта
 *
 * Используется для сохранения настроек импорта в SQLite
 * и координации последовательной обработки нескольких сериалов.
 */

import type { CqIteration, CqSearchProgress } from './vmaf'

/**
 * Статус элемента очереди импорта
 */
export type ImportQueueStatus =
  | 'pending' // Ожидает в очереди
  | 'vmaf' // Подбор CQ через VMAF (один раз на сериал)
  | 'preparing' // Создание аниме, demux, подготовка batch
  | 'transcoding' // Batch отправлен в ParallelTranscodeManager
  | 'postprocess' // Скриншоты, манифесты
  | 'completed' // Завершён успешно
  | 'error' // Ошибка
  | 'cancelled' // Отменён пользователем

/**
 * Настройки VMAF для элемента очереди
 */
export interface ImportQueueVmafSettings {
  /** Включён ли VMAF подбор CQ */
  enabled: boolean
  /** Целевой VMAF (0-100, по умолчанию 94) */
  targetVmaf: number
}

/**
 * Результат VMAF подбора CQ
 */
export interface ImportQueueVmafResult {
  /** Подобранный оптимальный CQ */
  optimalCq: number
  /** Достигнутый VMAF скор */
  vmafScore: number
  /** История итераций поиска */
  iterations: CqIteration[]
  /** Общее время подбора (мс) */
  totalTime: number
  /** Требуется CPU fallback (GPU crash) */
  useCpuFallback?: boolean
}

/**
 * Прогресс VMAF подбора (runtime only)
 */
export interface ImportQueueVmafProgress extends CqSearchProgress {
  /** Последний VMAF скор */
  lastVmaf?: number
}

/**
 * Выбранное аниме из Shikimori (минимальные данные для сохранения)
 */
export interface ImportQueueSelectedAnime {
  /** Shikimori ID (GraphQL возвращает string) */
  id: string
  /** Оригинальное название */
  name: string
  /** Русское название */
  russian: string | null
  /** Описание (plain text) */
  description: string | null
  /** Описание (HTML) */
  descriptionHtml: string | null
  /** URL постера */
  posterUrl: string | null
  /** Тип (tv, movie, ova, etc.) */
  kind: string | null
  /** Статус (released, ongoing, etc.) */
  status: string | null
  /** Количество эпизодов */
  episodes: number | null
  /** Год выхода */
  airedOn: string | null
  /** Количество вышедших эпизодов (опционально, из расширенных данных Shikimori) */
  episodesAired?: number
  /** Рейтинг Shikimori (опционально, из расширенных данных Shikimori) */
  score?: number | null
  /** Жанры/темы (опционально, из расширенных данных Shikimori) */
  genres?: Array<{ id: string; name: string; russian: string; kind: string }>
}

/**
 * Распознанный файл для импорта
 */
export interface ImportQueueFile {
  /** Полный путь к файлу */
  path: string
  /** Имя файла */
  name: string
  /** Номер эпизода */
  episodeNumber: number | null
  /** Выбран для импорта */
  selected: boolean
}

/**
 * Информация о папке (распознанная)
 */
export interface ImportQueueParsedInfo {
  /** Название аниме (очищенное) */
  animeName: string
  /** Номер сезона */
  seasonNumber: number | null
  /** Субгруппа */
  subGroup: string | null
  /** Качество */
  quality: string | null
  /** Исходное имя папки */
  original: string
  /** Источник названия */
  source: 'folder' | 'files'
  /** Источник — BDRemux/Bluray Remux (lossless) */
  isBdRemux?: boolean
  /** URL раздачи на Rutracker (если импортировано оттуда) */
  rutrackerUrl?: string
  /** CID сырых байт .torrent файла раздачи в IPFS (если импортировано оттуда) */
  sourceTorrentCid?: string
}

/**
 * Данные профиля кодирования для main process
 * Копируется из EncodingProfile при добавлении в очередь
 */
export interface ImportQueueEncodingProfile {
  id: string
  name: string
  codec: 'AV1' | 'HEVC' | 'H264'
  useGpu: boolean
  rateControl: 'CONSTQP' | 'VBR'
  cq: number
  maxBitrate: number | null
  preset: string
  tune: string | null
  multipass: string | null
  spatialAq: boolean
  temporalAq: boolean
  aqStrength: number | null
  lookahead: number | null
  lookaheadLevel: number | null
  gopSize: number | null
  bRefMode: string | null
  bFrames: number | null
  /** Принудительно использовать CPU кодирование */
  preferCpu?: boolean
}

/**
 * Настройки импорта
 */
export interface ImportQueueSettings {
  /** ID профиля кодирования */
  profileId: string | null
  /** Макс. параллельных аудио-потоков */
  audioMaxConcurrent: number
  /** Макс. параллельных видео-потоков (GPU) */
  videoMaxConcurrent: number
  /** Переопределённый CQ из VMAF */
  cqOverride?: number
  /** Использовать Anime4K апскейл (libplacebo + GPU шейдеры) */
  anime4kEnabled?: boolean
  /** Применить hqdn3d денойз перед кодированием */
  denoiseEnabled?: boolean
}

/**
 * Прогресс аудио-дорожки
 */
export interface ImportQueueAudioTrackProgress {
  /** Индекс дорожки */
  index: number
  /** Название дорожки (язык) */
  name: string
  /** Прогресс 0-100 */
  progress: number
}

/**
 * Информация о GPU воркере (видео кодирование)
 */
export interface ImportQueueVideoWorker {
  /** Индекс GPU (0 или 1 для dual encoder) */
  gpuIndex: number
  /** Имя обрабатываемого файла */
  fileName: string
  /** Прогресс 0-100 */
  progress: number
  /** FPS кодирования */
  fps?: number
  /** История FPS (последние N значений) для sparkline графика */
  fpsHistory?: number[]
  /** Скорость относительно реального времени */
  speed?: number
  /** Битрейт (kbps) */
  bitrate?: number
  /** CQ (если используется VMAF) */
  cq?: number
  /** VMAF скор (если был подобран) */
  vmafScore?: number
  /** Использует CPU fallback */
  useCpuFallback?: boolean
  /** Время с начала кодирования (мс) */
  elapsedMs?: number
}

/**
 * Информация о завершённом видео-файле (для отображения списка с экономией размера)
 */
export interface ImportQueueCompletedVideoFile {
  /** Имя файла */
  fileName: string
  /** Размер исходного видео-потока в байтах */
  sourceSize?: number
  /** Размер транскодированного видео в байтах */
  transcodedSize?: number
  /** CQ значение, использованное при кодировании */
  cq?: number
}

/**
 * Информация о CPU воркере (аудио кодирование)
 */
export interface ImportQueueAudioWorker {
  /** ID воркера */
  workerId: string
  /** Название дорожки */
  name: string
  /** Язык */
  language?: string
  /** Прогресс 0-100 */
  progress: number
  /** Статус */
  status: 'pending' | 'running' | 'completed' | 'error'
}

/**
 * Детальный прогресс транскодирования
 *
 * Runtime-only данные, не сохраняются в БД.
 */
export interface ImportQueueDetailProgress {
  /** FPS видеокодека */
  fps?: number
  /** Скорость относительно реального времени (1x, 2x, etc.) */
  speed?: number
  /** Текущий битрейт (kbps) */
  bitrate?: number
  /** Размер выходного файла (байты) */
  outputSize?: number
  /** Прогресс аудио-дорожек (legacy, для совместимости) */
  audioTracks?: ImportQueueAudioTrackProgress[]
  /** Активные GPU воркеры */
  videoWorkers?: ImportQueueVideoWorker[]
  /** Активные CPU воркеры */
  audioWorkers?: ImportQueueAudioWorker[]
  /** Завершённые видео-файлы текущего items с размерами для отображения экономии */
  completedVideoFiles?: ImportQueueCompletedVideoFile[]
  /** Статистика: всего видео задач */
  videoTotal?: number
  /** Статистика: завершённых видео задач */
  videoCompleted?: number
  /** Статистика: всего аудио задач */
  audioTotal?: number
  /** Статистика: завершённых аудио задач */
  audioCompleted?: number
}

/**
 * Рекомендация по аудиодорожке для сохранения в очереди
 */
export interface ImportQueueAudioRecommendation {
  /** Индекс дорожки (отрицательный для внешних) */
  trackIndex: number
  /** Действие: transcode или skip */
  action: 'transcode' | 'skip'
  /** Включена ли дорожка */
  enabled: boolean
  /** Внешняя дорожка (из папки типа Rus Sound) */
  isExternal?: boolean
  /** Путь к внешнему аудиофайлу */
  externalPath?: string
  /** Название группы озвучки (AniLibria, AniDUB и т.д.) */
  groupName?: string
  /** Язык аудиодорожки (ru, en, ja и т.д.) */
  language?: string
  /** Команда озвучки, выбранная пользователем в UI */
  dubGroup?: string
}

/**
 * Рекомендация по субтитрам для сохранения в очереди
 */
export interface ImportQueueSubtitleRecommendation {
  /** Индекс потока (или -1 для внешних) */
  streamIndex: number
  /** Язык */
  language: string
  /** Название */
  title: string
  /** Формат (ass, srt, vtt) */
  format: string
  /** Внешний файл? */
  isExternal: boolean
  /** Путь к внешнему файлу */
  externalPath?: string
  /** Включена для импорта */
  enabled: boolean
  /** Группа озвучки/субтитров (AniDUB, HorribleSubs и т.д.) */
  dubGroup?: string
  /** Тип субтитров (full, signs, songs) */
  subtitleType?: string
  /** Шрифты (для ASS) */
  matchedFonts?: Array<{ name: string; path: string }>
}

/**
 * Анализ файла для сохранения в очереди
 *
 * Содержит только критичные данные для восстановления выбора пользователя.
 * Полный mediaInfo пересканируется при обработке.
 */
export interface ImportQueueFileAnalysis {
  /** Номер эпизода */
  episodeNumber: number
  /** Рекомендации по аудиодорожкам (выбранные пользователем) */
  audioRecommendations: ImportQueueAudioRecommendation[]
  /** Рекомендации по субтитрам (выбранные пользователем) */
  subtitleRecommendations?: ImportQueueSubtitleRecommendation[]
}

/**
 * Элемент очереди импорта
 *
 * Содержит все данные из wizard'а для воспроизведения импорта.
 */
export interface ImportQueueEntry {
  /** Уникальный идентификатор */
  id: string
  /** Текущий статус */
  status: ImportQueueStatus
  /** Приоритет (меньше = раньше) */
  priority: number
  /** Время добавления в очередь */
  addedAt: string
  /** Время начала обработки */
  startedAt?: string
  /** Время завершения */
  completedAt?: string

  // === Данные из wizard'а ===

  /** Путь к папке с видео */
  folderPath: string
  /** Распознанная информация о папке */
  parsedInfo: ImportQueueParsedInfo
  /** Выбранное аниме из Shikimori */
  selectedAnime: ImportQueueSelectedAnime
  /** Список файлов */
  files: ImportQueueFile[]
  /** Настройки импорта */
  importSettings: ImportQueueSettings
  /** Настройки VMAF подбора CQ */
  vmafSettings?: ImportQueueVmafSettings
  /** Данные профиля кодирования (копируется при добавлении для main process) */
  encodingProfile?: ImportQueueEncodingProfile
  /** Анализ файлов с рекомендациями по аудиодорожкам */
  fileAnalyses?: ImportQueueFileAnalysis[]
  /** Принудительное использование CPU кодирования (per-item опция) */
  forceCpu?: boolean
  /** Игнорировать ошибку неэффективного сжатия при следующем retry */
  skipCompressionCheck?: boolean
  /** Режим импорта одиночного файла (не папки) — не сканировать внешние субтитры/аудио */
  isFileMode?: boolean

  // === Данные донора (опционально) ===

  /** Путь к донору */
  donorPath?: string | null
  /** Файлы донора */
  donorFiles?: ImportQueueFile[]
  /** Сдвиг синхронизации (мс) */
  syncOffset?: number

  // === Retranscode mode ===

  /** Режим повторного транскода недостающих эпизодов */
  isRetranscode?: boolean
  /** ID существующего аниме (для retranscode — пропускаем создание) */
  existingAnimeId?: string

  // === Pre-encode (для реимпорта битых эпизодов) ===

  /** Включить pre-encode исходника в H264 перед основным транскодом */
  preEncode?: boolean
  /** CRF для pre-encode (дефолт 14 — с запасом качества) */
  preEncodeCrf?: number
  /** Preset для pre-encode (дефолт medium) */
  preEncodePreset?: string

  // === Runtime данные ===

  /** Глобальная настройка useGpu из Settings (заполняется main process при processNext) */
  globalUseGpu?: boolean
  /** Глобальная настройка audioBitrate из Settings (заполняется main process при processNext) */
  globalAudioBitrate?: number
  /** Глобальная настройка libraryPath из Settings (заполняется main process при processNext) */
  globalLibraryPath?: string | null
  /** Прогресс (0-100) */
  progress?: number
  /** Текущий обрабатываемый файл */
  currentFileName?: string
  /** Текущая стадия обработки */
  currentStage?: string
  /** Сообщение об ошибке */
  error?: string
  /** Детальный прогресс транскодирования (runtime only, не сохраняется в БД) */
  detailProgress?: ImportQueueDetailProgress
  /** Прогресс VMAF подбора (runtime only) */
  vmafProgress?: ImportQueueVmafProgress

  // === Результаты ===

  /** Результат VMAF подбора CQ (сохраняется в БД) */
  vmafResult?: ImportQueueVmafResult
  /** ID созданного аниме в БД */
  createdAnimeId?: string
  /** Путь к папке аниме в библиотеке */
  createdAnimeFolder?: string
}

/**
 * Состояние очереди импорта
 */
export interface ImportQueueState {
  /** Все элементы очереди */
  items: ImportQueueEntry[]
  /** ID текущего обрабатываемого элемента */
  currentId: string | null
  /** Очередь на паузе */
  isPaused: boolean
  /** Автоматический запуск при добавлении */
  autoStart: boolean
}

/**
 * Данные для добавления в очередь (без автогенерируемых полей)
 */
export type ImportQueueAddData = Omit<
  ImportQueueEntry,
  'id' | 'status' | 'priority' | 'addedAt' | 'startedAt' | 'completedAt' | 'progress' | 'currentFileName' | 'error'
>
