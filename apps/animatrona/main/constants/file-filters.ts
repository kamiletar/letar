/**
 * Константы фильтров файлов для диалогов выбора
 *
 * Централизованное место для всех фильтров файлов в приложении.
 * Используй эти константы вместо хардкода фильтров в dialog handlers.
 */

import type { FileFilter } from '../../shared/types'

/**
 * Фильтры для видеофайлов
 */
export const VIDEO_FILTERS: FileFilter[] = [
  { name: 'Видео', extensions: ['mkv', 'mp4', 'avi', 'webm', 'mov', 'ts', 'm2ts'] },
  { name: 'Все файлы', extensions: ['*'] },
]

/**
 * Фильтры для аудиофайлов
 */
export const AUDIO_FILTERS: FileFilter[] = [
  { name: 'Аудио', extensions: ['aac', 'opus', 'flac', 'mp3', 'ogg', 'wav', 'eac3', 'ac3', 'dts'] },
  { name: 'Все файлы', extensions: ['*'] },
]

/**
 * Фильтры для субтитров
 */
export const SUBTITLE_FILTERS: FileFilter[] = [
  { name: 'Субтитры', extensions: ['ass', 'srt', 'vtt', 'ssa', 'sub'] },
  { name: 'Все файлы', extensions: ['*'] },
]

/**
 * Фильтры для MKV экспорта
 */
export const MKV_EXPORT_FILTERS: FileFilter[] = [
  { name: 'Видео MKV', extensions: ['mkv'] },
  { name: 'Все файлы', extensions: ['*'] },
]

/**
 * Фильтры для шрифтов
 */
export const FONT_FILTERS: FileFilter[] = [
  { name: 'Шрифты', extensions: ['ttf', 'otf', 'woff', 'woff2'] },
  { name: 'Все файлы', extensions: ['*'] },
]

/**
 * Фильтры для изображений (постеры, обложки)
 */
export const IMAGE_FILTERS: FileFilter[] = [
  { name: 'Изображения', extensions: ['jpg', 'jpeg', 'png', 'webp', 'avif'] },
  { name: 'Все файлы', extensions: ['*'] },
]

/**
 * Объект со всеми фильтрами для удобного доступа
 */
export const FILE_FILTERS = {
  VIDEO: VIDEO_FILTERS,
  AUDIO: AUDIO_FILTERS,
  SUBTITLE: SUBTITLE_FILTERS,
  MKV_EXPORT: MKV_EXPORT_FILTERS,
  FONT: FONT_FILTERS,
  IMAGE: IMAGE_FILTERS,
} as const
