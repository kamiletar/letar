/**
 * Консолидированные утилиты форматирования для экосистемы Animatrona
 *
 * Объединяет функции из:
 * - libs/animatrona-shared/src/utils/format.ts (mobile/TV/desktop)
 * - apps/animatrona/shared/utils/format.ts (desktop)
 * - apps/animatrona-tracker/src/lib/ipfs.ts (tracker)
 */

// --- Размеры файлов ---

/**
 * Форматирует размер файла в читаемый вид (английские единицы)
 * @returns Строка вида "1.5 GB", "256 MB", "12 KB", "100 B"
 */
export function formatFileSize(bytes: number | undefined | null): string {
  if (bytes === null || bytes === undefined) {
    return '--'
  }
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/**
 * Форматирование размера файла: "1.5 MB", "256 KB"
 */
export function formatBytes(bytes: number | undefined | null): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) {
    return '--'
  }
  if (bytes === 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1)
  const value = bytes / k ** i

  return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

/**
 * Форматирование размера файла в русских единицах: "1.5 МБ", "256 КБ"
 */
export function formatFileSizeRu(bytes: bigint | number): string {
  const size = typeof bytes === 'bigint' ? Number(bytes) : bytes
  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
  let unitIndex = 0

  let value = size
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${value.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`
}

// --- Длительность ---

/**
 * Длительность в формате таймлайна: "1:23:45" или "23:45"
 */
export function formatDuration(seconds: number | undefined | null): string {
  if (seconds === null || seconds === undefined || !isFinite(seconds)) {
    return '--'
  }
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

/**
 * Длительность в человекочитаемом формате: "1ч 23м 45с"
 */
export function formatDurationHuman(seconds: number | undefined): string {
  if (seconds === undefined || seconds < 0 || !isFinite(seconds)) {
    return '--:--'
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}ч ${minutes}м ${secs}с`
  }
  if (minutes > 0) {
    return `${minutes}м ${secs}с`
  }
  return `${secs}с`
}

/**
 * Длительность из миллисекунд в человекочитаемый формат
 */
export function formatDurationMs(ms: number | undefined): string {
  if (ms === undefined || ms < 0) {
    return '--:--'
  }
  return formatDurationHuman(ms / 1000)
}

/**
 * Форматирование времени раздачи (мс) в человекочитаемый формат
 * @example formatSeedingTime(90000000) // "1д 1ч"
 * @example formatSeedingTime(7200000) // "2ч"
 * @example formatSeedingTime(2700000) // "45мин"
 */
export function formatSeedingTime(ms: bigint | number): string {
  const totalMinutes = Math.floor((typeof ms === 'bigint' ? Number(ms) : ms) / 60000)

  if (totalMinutes < 1) {
    return '< 1 мин'
  }

  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) {
    return hours > 0 ? `${days}д ${hours}ч` : `${days}д`
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}ч ${minutes}мин` : `${hours}ч`
  }
  return `${minutes}мин`
}

// --- Скорости и битрейты ---

/**
 * Битрейт: "5.2 Mbps" или "320 kbps" (вход: bits/sec)
 */
export function formatBitrate(bitsPerSecond: number | undefined | null): string {
  if (bitsPerSecond === null || bitsPerSecond === undefined) {
    return '--'
  }
  if (bitsPerSecond >= 1_000_000) {
    return `${(bitsPerSecond / 1_000_000).toFixed(1)} Mbps`
  }
  return `${Math.round(bitsPerSecond / 1000)} kbps`
}

/**
 * Битрейт (вход: kbps): "2.5 Mbps" или "256 kbps"
 */
export function formatBitrateKbps(kbps: number | undefined): string {
  if (kbps === undefined || kbps < 0) {
    return '--'
  }
  if (kbps >= 1000) {
    return `${(kbps / 1000).toFixed(1)} Mbps`
  }
  return `${kbps.toFixed(0)} kbps`
}

/**
 * Скорость транскодирования (множитель реального времени): "1.50x"
 */
export function formatSpeed(speed: number | undefined): string {
  if (speed === undefined || speed < 0 || !isFinite(speed)) {
    return '--'
  }
  return `${speed.toFixed(2)}x`
}

/**
 * Скорость передачи данных (bytes/sec): "5.2 MB/s"
 */
export function formatTransferSpeed(bytesPerSec: number | undefined | null): string {
  if (bytesPerSec === null || bytesPerSec === undefined || Number.isNaN(bytesPerSec) || bytesPerSec < 1) {
    return '0 B/s'
  }
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.min(Math.floor(Math.log(bytesPerSec) / Math.log(k)), sizes.length - 1)
  return `${parseFloat((bytesPerSec / k ** i).toFixed(1))} ${sizes[i]}`
}

// --- Прочее ---

/**
 * FPS: "45 fps"
 */
export function formatFps(fps: number | undefined): string {
  if (fps === undefined || fps < 0 || !isFinite(fps)) {
    return '--'
  }
  return `${fps.toFixed(0)} fps`
}

/**
 * Количество аудиоканалов: "Mono", "Stereo", "5.1", "7.1", "6ch"
 */
export function formatChannels(channels: number): string {
  switch (channels) {
    case 1:
      return 'Mono'
    case 2:
      return 'Stereo'
    case 6:
      return '5.1'
    case 8:
      return '7.1'
    default:
      return `${channels}ch`
  }
}

/**
 * Длительность в человекочитаемом виде: "23 мин", "1 ч 23 мин"
 * Отличается от formatDurationHuman (которая выдаёт "1ч 23м 45с")
 * тем, что не показывает секунды и использует полные слова.
 */
export function formatDurationMinutes(seconds: number | undefined | null): string {
  if (seconds === null || seconds === undefined || !isFinite(seconds) || seconds <= 0) {
    return ''
  }
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes} мин`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours} ч ${mins} мин` : `${hours} ч`
}

/**
 * Коэффициент сжатия (процент от оригинала)
 */
export function calculateCompressionRatio(
  inputSize: number | undefined,
  outputSize: number | undefined
): number | undefined {
  if (!inputSize || !outputSize || inputSize === 0) {
    return undefined
  }
  return (outputSize / inputSize) * 100
}
