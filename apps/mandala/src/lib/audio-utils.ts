/**
 * Утилиты для аудио-анализа.
 * Константы, типы и вспомогательные функции для Web Audio API.
 */

// =============================================================================
// Типы
// =============================================================================

/**
 * Данные анализа аудио.
 */
export interface AudioAnalyzerData {
  /** Средняя амплитуда (0-1) */
  amplitude: number
  /** Низкие частоты — бас (0-1) */
  bass: number
  /** Средние частоты (0-1) */
  mid: number
  /** Высокие частоты (0-1) */
  high: number
  /** Обнаружен удар (бит) */
  beatDetected: boolean
  /** Интенсивность бита (0-1), для плавных эффектов */
  beatIntensity: number
  /** Есть ли доступ к микрофону */
  hasMicrophoneAccess?: boolean
  /** Ошибка доступа к микрофону */
  microphoneError?: string
}

/**
 * Диапазон частот.
 */
export interface FrequencyRange {
  min: number
  max: number
}

/**
 * Границы частотных диапазонов в бинах FFT.
 */
export interface FrequencyBins {
  bassEnd: number
  midEnd: number
}

// =============================================================================
// Константы
// =============================================================================

/**
 * Начальные значения для данных анализа.
 */
export const INITIAL_ANALYZER_DATA: AudioAnalyzerData = {
  amplitude: 0,
  bass: 0,
  mid: 0,
  high: 0,
  beatDetected: false,
  beatIntensity: 0,
  hasMicrophoneAccess: undefined,
  microphoneError: undefined,
}

/**
 * Частотные диапазоны в Hz.
 */
export const FREQUENCY_RANGES: Record<'bass' | 'mid' | 'high', FrequencyRange> = {
  bass: { min: 20, max: 250 },
  mid: { min: 250, max: 2000 },
  high: { min: 2000, max: 20000 },
}

/**
 * Размер истории баса для энергетического анализа.
 * 15 кадров ≈ 250ms при 60fps
 */
export const BASS_HISTORY_SIZE = 15

/**
 * Параметры анализатора по умолчанию.
 */
export const DEFAULT_ANALYZER_OPTIONS = {
  /** Размер FFT (степень 2, 32-2048). Больше = точнее, но медленнее */
  fftSize: 512,
  /** Сглаживание временного усреднения (0-1) */
  smoothingTimeConstant: 0.85,
  /** Множитель порога для энергетического beat detection (1.0-2.0) */
  energyThresholdMultiplier: 1.5,
  /** Минимальный абсолютный уровень баса для детекции бита (0-1) */
  minBassLevel: 0.15,
  /** Минимальный интервал между битами в мс */
  beatCooldown: 120,
} as const

// =============================================================================
// Функции
// =============================================================================

/**
 * Вычислить границы частотных диапазонов на основе sample rate и FFT size.
 *
 * @param sampleRate - Sample rate аудио контекста
 * @param fftSize - Размер FFT
 * @param binCount - Количество бинов (fftSize / 2)
 */
export function computeFrequencyBins(sampleRate: number, fftSize: number, binCount: number): FrequencyBins {
  const binFrequency = sampleRate / (fftSize * 2)

  return {
    bassEnd: Math.min(Math.ceil(FREQUENCY_RANGES.bass.max / binFrequency), binCount),
    midEnd: Math.min(Math.ceil(FREQUENCY_RANGES.mid.max / binFrequency), binCount),
  }
}

/**
 * Вычислить среднее значение из истории.
 */
export function computeAverage(history: number[]): number {
  if (history.length === 0) {
    return 0
  }
  return history.reduce((a, b) => a + b, 0) / history.length
}

/**
 * Вычислить интенсивность скачка энергии.
 *
 * @param current - Текущее значение
 * @param average - Среднее значение из истории
 * @param thresholdMultiplier - Множитель порога
 */
export function computeEnergyJumpIntensity(current: number, average: number, thresholdMultiplier: number): number {
  const energyJump = average > 0.01 ? current / average : 0
  return Math.min(1, Math.max(0, (energyJump - 1) / (thresholdMultiplier - 1)))
}

/**
 * Проверить, обнаружен ли бит.
 *
 * @param currentBass - Текущий уровень баса
 * @param avgBass - Средний уровень баса из истории
 * @param thresholdMultiplier - Множитель порога
 * @param minBassLevel - Минимальный абсолютный уровень
 * @param lastBeatTime - Время последнего бита
 * @param cooldown - Минимальный интервал между битами
 */
export function detectBeat(
  currentBass: number,
  avgBass: number,
  thresholdMultiplier: number,
  minBassLevel: number,
  lastBeatTime: number,
  cooldown: number
): boolean {
  const now = performance.now()
  return currentBass > avgBass * thresholdMultiplier && currentBass > minBassLevel && now - lastBeatTime > cooldown
}
