/**
 * @letar/animatrona-utils — shared-утилиты для web-стека Animatrona
 */

export { isValidCid } from './cid'
export { ANIME_STATUS_CONFIG, PUBLISH_STATUS_CONFIG, getAnimeStatusConfig, type AnimeStatusInfo } from './constants'
export { buildExternalLinks, type ExternalLinkEntry } from './external-links'
export {
  calculateCompressionRatio,
  formatBitrate,
  formatBitrateKbps,
  formatBytes,
  formatChannels,
  formatDuration,
  formatDurationHuman,
  formatDurationMinutes,
  formatDurationMs,
  formatFileSize,
  formatFileSizeRu,
  formatFps,
  formatSeedingTime,
  formatSpeed,
  formatTransferSpeed,
} from './format'
export { createMediaUrlHelpers, type MediaUrlHelpers } from './media-url'
