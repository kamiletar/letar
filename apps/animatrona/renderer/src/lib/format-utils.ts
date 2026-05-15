/**
 * Реэкспорт утилит форматирования из shared
 *
 * Импортируйте через '@/lib/format-utils' в renderer.
 * Все реализации находятся в shared/utils/format.ts.
 */
export {
  calculateCompressionRatio,
  formatBitrate,
  formatBitrateKbps,
  formatBytes,
  formatChannels,
  formatDuration,
  formatDurationHuman,
  formatDurationMs,
  formatFileSize,
  formatFps,
  formatSpeed,
  formatTransferSpeed,
} from '../../../shared/utils/format'
