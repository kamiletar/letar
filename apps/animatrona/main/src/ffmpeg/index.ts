/**
 * FFmpeg модуль — экспорт всех функций
 */

// Типы
export * from './types'

// Probe (анализ файлов)
export { getAudioTracks, getVideoDuration, getVideoTracks, probeFile } from './probe'

// Транскодирование
export { defaultAudioOptions, defaultVideoOptions, transcodeAudio, transcodeVideo } from './transcode'

// Мерж
export { mergeMKV } from './merge'

// VMAF (расчёт качества)
export { averageVmaf, calculateVMAF, calculateVMAFBatch, findOptimalCQ } from './vmaf'

// Сэмплирование
export { cleanupSamples, type EncodedSample, encodeSamplesParallel, extractSamples } from './sample'
