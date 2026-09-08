export { allowFilePath, allowPath, getAllowedPaths, initAllowedPaths, isPathAllowed } from './lib/allowed-paths'
export {
  type ExternalAudioMatch,
  type ExternalAudioScanResult,
  extractGroupNameFromAudioDir,
  extractTitleFromAudioFilename,
  fuzzyMatchToVideo,
  normalizeLanguageCode,
  scanForExternalAudio,
} from './lib/external-audio-scanner'
export {
  type ExternalSubtitleMatch,
  type ExternalSubtitleScanResult,
  scanForExternalSubtitles,
} from './lib/external-subtitle-scanner'
export {
  findFilesRecursively,
  findFonts,
  getFontInfo,
  getFontMimeType,
  matchFonts,
  normalizeFontName,
} from './lib/font-matcher'
export { collectFiles, scanDirectoryRecursive } from './lib/fs-utils'
export { createModuleLogger, type ModuleLogger } from './lib/logger'
/**
 * Расширения медиафайлов. Барель тянет за собой `node:fs`/`electron`, поэтому в renderer
 * подключай не его, а отдельную точку входа `@letar/folder-scan/media-extensions` — она
 * без зависимостей от рантайма.
 */
export {
  AUDIO_EXTENSIONS,
  BITMAP_SUBTITLE_EXTENSIONS,
  FONT_EXTENSIONS,
  getExtension,
  hasExtension,
  PLAYABLE_VIDEO_EXTENSIONS,
  SELECTABLE_SUBTITLE_EXTENSIONS,
  SUBTITLE_EXTENSIONS,
  TRANSPORT_STREAM_EXTENSIONS,
  VIDEO_EXTENSIONS,
  withoutDots,
} from './lib/media-extensions'
export type { AudioTrack, MediaChapter, MediaInfo, MediaProber, SubtitleTrack, VideoTrack } from './lib/media-prober'
export { createMediaProtocolHandler, registerMediaProtocol, setupMediaProtocolHandler } from './lib/media-protocol'
export { type MediaFileInfo, type MediaType, scanFolderForMedia } from './lib/scan-folder'
export {
  detectLanguageFromName,
  detectLanguageFromPath,
  detectTitleFromPath,
  getFontsFromASS,
  getSubtitleInfo,
  type SubtitleInfo,
} from './lib/subtitle-parser'
export {
  detectSubtitleType,
  isDispositionFlagSet,
  isPartialSubtitleType,
  type StreamDisposition,
  type SubtitleType,
  type SubtitleTypeSource,
} from './lib/subtitle-type'
