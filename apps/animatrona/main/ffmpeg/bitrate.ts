/**
 * Модуль подбора битрейта — умный выбор оптимального битрейта для AAC
 */

/** Максимальный target битрейт (kbps) */
const MAX_TARGET_BITRATE = 192

/** Дефолтный битрейт если исходный неизвестен (kbps) */
const DEFAULT_BITRATE = 192

/**
 * Подбор оптимального битрейта для AAC VBR
 *
 * Логика:
 * - Если исходный bitrate неизвестен → 192 kbps
 * - Если исходный bitrate меньше 192 → используем исходный
 * - Если исходный bitrate больше 192 → 192 kbps
 *
 * @param sourceBitrate Битрейт исходного файла в bps (от ffprobe)
 * @returns Рекомендуемый битрейт в kbps
 */
export function suggestAudioBitrate(sourceBitrate?: number): number {
  if (!sourceBitrate) {
    return DEFAULT_BITRATE
  }

  // ffprobe возвращает битрейт в bps, конвертируем в kbps
  const sourceBitrateKbps = Math.round(sourceBitrate / 1000)

  return Math.min(sourceBitrateKbps, MAX_TARGET_BITRATE)
}

/**
 * Форматирование битрейта для отображения
 *
 * @param bitrateKbps Битрейт в kbps
 * @returns Строка вида "256 kbps"
 */
export function formatBitrate(bitrateKbps: number): string {
  return `${bitrateKbps} kbps`
}

/**
 * Форматирование исходного битрейта для отображения
 *
 * @param sourceBitrateBps Битрейт в bps (от ffprobe) или undefined
 * @returns Строка вида "384 kbps" или "неизвестно"
 */
export function formatSourceBitrate(sourceBitrateBps?: number): string {
  if (!sourceBitrateBps) {
    return 'неизвестно'
  }
  return `${Math.round(sourceBitrateBps / 1000)} kbps`
}
