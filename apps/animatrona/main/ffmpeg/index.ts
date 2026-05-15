/**
 * FFmpeg модуль — экспорт всех функций
 */

// Типы
export * from './types'

// Probe (анализ файлов)
export { getAudioTracks, getVideoDuration, getVideoTracks, probeFile } from './probe'

// Транскодирование
export {
  defaultAudioOptions,
  defaultAudioVBROptions,
  defaultVideoOptions,
  encodeSample,
  transcodeAudio,
  transcodeAudioVBR,
  transcodeVideo,
  transcodeVideoWithProfile,
} from './transcode'

// Мерж
export { mergeMKV } from './merge'

// Demux (извлечение потоков)
export { demuxFile, extractFontsFromFile, extractStream, type ExtractedFont } from './demux'

// Подбор битрейта
export { formatBitrate, formatSourceBitrate, suggestAudioBitrate } from './bitrate'

// Скриншоты
export {
  extractFrame,
  generateScreenshots,
  generateThumbnailSprite,
  getScreenshotSize,
  type FrameOptions,
  type ScreenshotOptions,
  type ScreenshotResult,
  type SpriteSheetOptions,
  type SpriteSheetResult,
} from './screenshot'
