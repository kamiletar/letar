/**
 * @letar/animatrona-utils — shared-утилиты для web-стека Animatrona
 */

export { isValidCid } from './cid'
export {
  ANIME_KIND_CONFIG,
  ANIME_STATUS_CONFIG,
  type AnimeKindInfo,
  type AnimeStatusInfo,
  getAnimeKindInfo,
  getAnimeStatusConfig,
  getRelationKindInfo,
  PUBLISH_STATUS_CONFIG,
  RELATION_KIND_CONFIG,
  type RelationKindInfo,
} from './constants'
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
