/**
 * FFmpeg утилиты — общие функции для demux, probe и transcode
 */

// Парсеры
export { extractBitrate, getBitDepth, needsAudioTranscode, parseTimeToSeconds } from './parsers'
export type { StreamWithBitrate } from './parsers'

// Языки
export { getLanguageName, getLanguageNameOrFallback, isValidLanguageCode } from './languages'
