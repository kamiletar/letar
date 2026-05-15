/**
 * Типы для VMAF автоподбора качества
 */

/** Результат расчёта VMAF */
export interface VmafResult {
  /** Итоговый VMAF скор (0-100) */
  score: number
  /** Среднее значение по всем кадрам */
  pooledMean: number
  /** Минимальное значение */
  min: number
  /** Максимальное значение */
  max: number
  /** Время расчёта в мс */
  calculationTime: number
}

/** Опции расчёта VMAF */
export interface VmafOptions {
  /** Модель VMAF (автовыбор по разрешению если не указано) */
  model?: 'vmaf_v0.6.1' | 'vmaf_4k_v0.6.1'
  /** Субсэмплинг для ускорения (1-10, default 5) */
  subsample?: number
  /** Количество потоков (default = os.cpus().length) */
  threads?: number
  /** Использовать phone model для мобильного контента */
  phoneModel?: boolean
}

/** Конфигурация сэмплирования */
export interface SampleConfig {
  /** Длительность сэмпла в секундах (default 20) */
  duration: number
  /** Количество сэмплов (default 4 для параллельного GPU) */
  count: number
  /** Позиции сэмплов 0-1 (default [0.2, 0.4, 0.6, 0.8]) */
  positions: number[]
}

/** Опции поиска оптимального CQ */
export interface CqSearchOptions {
  /** Целевой VMAF (default 95) */
  targetVmaf: number
  /** Допустимое отклонение (default 1) */
  tolerance: number
  /** Диапазон CQ для поиска [min, max] */
  cqRange: [number, number]
  /** Максимум итераций (default 6) */
  maxIterations: number
  /** Конфигурация сэмплов */
  sampleConfig?: Partial<SampleConfig>
  /** ID профиля кодирования */
  profileId: string
  /** Игнорировать ошибку неэффективного сжатия (для повторного энкода) */
  skipCompressionCheck?: boolean
  /**
   * FFmpeg -vf фильтр для применения к сэмплам при извлечении
   * Используется для Anime4K: сэмплы апскейлятся до 1080p и становятся эталоном
   * VMAF-итерации кодируют этот эталон (без повторного фильтра) при разных CQ
   */
  anime4kFilter?: string
}

/** Одна итерация поиска CQ */
export interface CqIteration {
  /** Тестируемый CQ */
  cq: number
  /** Результат VMAF */
  vmaf: number
  /** Размер закодированных сэмплов */
  size: number
  /** Время кодирования в мс */
  encodingTime: number
  /** Время расчёта VMAF в мс */
  vmafTime: number
}

/** Результат поиска оптимального CQ */
export interface CqSearchResult {
  /** Найденный оптимальный CQ */
  optimalCq: number
  /** VMAF при этом CQ */
  vmafScore: number
  /** Ожидаемый размер файла в байтах */
  estimatedSize: number
  /** Экономия относительно оригинала (0-1) */
  estimatedSavings: number
  /** История итераций поиска */
  iterations: CqIteration[]
  /** Общее время поиска в мс */
  totalTime: number
  /**
   * Требуется CPU fallback (GPU encoding crashed)
   * Устанавливается если av1_nvenc crash на сэмплах
   */
  useCpuFallback?: boolean
}

/** Прогресс поиска CQ */
export interface CqSearchProgress {
  /** Текущая итерация */
  currentIteration: number
  /** Всего итераций (примерно) */
  totalIterations: number
  /** Текущий этап */
  stage: 'extracting' | 'encoding' | 'calculating' | 'done'
  /** Текущий тестируемый CQ */
  currentCq?: number
  /** Последняя итерация */
  lastIteration?: CqIteration
  /** Все пройденные итерации */
  iterations?: CqIteration[]
  /** Последний VMAF скор (для отображения) */
  lastVmaf?: number
  /** Используется CPU fallback (GPU encoding crashed) */
  useCpuFallback?: boolean
  /** Размер исходного файла (для расчёта % экономии) */
  originalSize?: number
}

/** Диапазоны CQ по кодекам */
export const CQ_RANGES: Record<string, [number, number]> = {
  av1: [16, 48], // nvenc max=51, svt-av1 max=63
  hevc: [18, 42], // nvenc max=51
  h264: [18, 38], // nvenc max=51
}

/** Рекомендуемые начальные CQ для VMAF 95 */
export const RECOMMENDED_CQ: Record<string, number> = {
  av1: 26,
  hevc: 24,
  h264: 23,
}

/** Дефолтная конфигурация сэмплов */
export const DEFAULT_SAMPLE_CONFIG: SampleConfig = {
  duration: 20,
  count: 4,
  positions: [0.2, 0.4, 0.6, 0.8],
}

/** Дефолтные опции VMAF */
export const DEFAULT_VMAF_OPTIONS: VmafOptions = {
  subsample: 5,
}
