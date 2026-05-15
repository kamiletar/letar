/**
 * Хелперы файловой системы для оффлайн-хранения
 *
 * Пути скачанных файлов:
 * - Видео: {DocumentDir}/animatrona/videos/{animeId}/{episodeId}.mp4
 * - Аудио: {DocumentDir}/animatrona/audio/{animeId}/{episodeId}/{trackId}.m4a
 * - Субтитры: {DocumentDir}/animatrona/subs/{animeId}/{episodeId}/{trackId}.{ext}
 * - Постеры: {DocumentDir}/animatrona/posters/{animeId}.jpg
 */

import ReactNativeBlobUtil from 'react-native-blob-util'

const { fs } = ReactNativeBlobUtil

/** Базовая директория для хранения */
const BASE_DIR = `${fs.dirs.DocumentDir}/animatrona`

/** Поддиректории */
const DIRS = {
  videos: `${BASE_DIR}/videos`,
  audio: `${BASE_DIR}/audio`,
  subs: `${BASE_DIR}/subs`,
  fonts: `${BASE_DIR}/fonts`,
  posters: `${BASE_DIR}/posters`,
} as const

// --- Пути ---

/** Путь к скачанному видео эпизода */
export function getVideoPath(animeId: string, episodeId: string): string {
  return `${DIRS.videos}/${animeId}/${episodeId}.mp4`
}

/** Путь к скачанной аудиодорожке эпизода */
export function getAudioPath(animeId: string, episodeId: string, trackId: string): string {
  return `${DIRS.audio}/${animeId}/${episodeId}/${trackId}.m4a`
}

/** Путь к скачанным субтитрам */
export function getSubtitlePath(animeId: string, episodeId: string, trackId: string, format: string): string {
  return `${DIRS.subs}/${animeId}/${episodeId}/${trackId}.${format}`
}

/** Путь к папке шрифтов эпизода (для libass fontDir) */
export function getFontDir(animeId: string, episodeId: string): string {
  return `${DIRS.fonts}/${animeId}/${episodeId}`
}

/** Путь к конкретному файлу шрифта */
export function getFontPath(animeId: string, episodeId: string, fontCid: string): string {
  return `${DIRS.fonts}/${animeId}/${episodeId}/${fontCid}.ttf`
}

/** Путь к скачанному постеру */
export function getPosterPath(animeId: string): string {
  return `${DIRS.posters}/${animeId}.jpg`
}

/** file:// URI для использования в компонентах */
export function toFileUri(path: string): string {
  return `file://${path}`
}

// --- Операции с файлами ---

/** Инициализация директорий (вызвать при старте приложения) */
export async function ensureDirectories(): Promise<void> {
  for (const dir of Object.values(DIRS)) {
    const exists = await fs.isDir(dir)
    if (!exists) {
      await fs.mkdir(dir)
    }
  }
}

/** Проверить существование файла */
export async function fileExists(path: string): Promise<boolean> {
  try {
    return await fs.exists(path)
  } catch {
    return false
  }
}

/** Удалить файл */
export async function deleteFile(path: string): Promise<void> {
  try {
    const exists = await fs.exists(path)
    if (exists) {
      await fs.unlink(path)
    }
  } catch (error) {
    console.warn('[fileStorage] Ошибка удаления файла:', path, error)
  }
}

/** Удалить все файлы эпизода (видео + аудио + субтитры) */
export async function deleteEpisodeFiles(animeId: string, episodeId: string): Promise<void> {
  // Видео
  await deleteFile(getVideoPath(animeId, episodeId))

  // Аудио — удалить всю папку эпизода
  const audioDir = `${DIRS.audio}/${animeId}/${episodeId}`
  try {
    const exists = await fs.isDir(audioDir)
    if (exists) {
      await fs.unlink(audioDir)
    }
  } catch {
    // Игнорируем — папка может не существовать
  }

  // Субтитры — удалить всю папку эпизода
  const subsDir = `${DIRS.subs}/${animeId}/${episodeId}`
  try {
    const exists = await fs.isDir(subsDir)
    if (exists) {
      await fs.unlink(subsDir)
    }
  } catch {
    // Игнорируем
  }

  // Шрифты — удалить всю папку эпизода
  const fontsDir = `${DIRS.fonts}/${animeId}/${episodeId}`
  try {
    const exists = await fs.isDir(fontsDir)
    if (exists) {
      await fs.unlink(fontsDir)
    }
  } catch {
    // Игнорируем
  }
}

/** Удалить все файлы аниме (включая постер) */
export async function deleteAnimeFiles(animeId: string): Promise<void> {
  const dirs = [
    `${DIRS.videos}/${animeId}`,
    `${DIRS.audio}/${animeId}`,
    `${DIRS.subs}/${animeId}`,
    `${DIRS.fonts}/${animeId}`,
  ]

  for (const dir of dirs) {
    try {
      const exists = await fs.isDir(dir)
      if (exists) {
        await fs.unlink(dir)
      }
    } catch {
      // Игнорируем
    }
  }

  // Постер
  await deleteFile(getPosterPath(animeId))
}

// --- Информация о хранилище ---

/** Получить размер файла в байтах */
export async function getFileSize(path: string): Promise<number> {
  try {
    const stat = await fs.stat(path)
    return Number(stat.size) || 0
  } catch {
    return 0
  }
}

/** Рекурсивно подсчитать размер директории */
async function getDirSize(dirPath: string): Promise<number> {
  try {
    const exists = await fs.isDir(dirPath)
    if (!exists) {
      return 0
    }

    const items = await fs.ls(dirPath)
    let total = 0

    for (const item of items) {
      const itemPath = `${dirPath}/${item}`
      const isDir = await fs.isDir(itemPath)

      if (isDir) {
        total += await getDirSize(itemPath)
      } else {
        total += await getFileSize(itemPath)
      }
    }

    return total
  } catch {
    return 0
  }
}

/** Размер всех скачанных файлов (видео + аудио + субтитры + шрифты) */
export async function getDownloadedSize(): Promise<number> {
  const [videos, audio, subs, fonts] = await Promise.all([
    getDirSize(DIRS.videos),
    getDirSize(DIRS.audio),
    getDirSize(DIRS.subs),
    getDirSize(DIRS.fonts),
  ])
  return videos + audio + subs + fonts
}

/** Размер кэша постеров */
export async function getPosterCacheSize(): Promise<number> {
  return getDirSize(DIRS.posters)
}

/** Общий размер всех данных animatrona */
export async function getTotalStorageUsed(): Promise<number> {
  return getDirSize(BASE_DIR)
}

/** Свободное место на устройстве */
export async function getAvailableStorage(): Promise<number> {
  try {
    const stat = await fs.df()
    // Android возвращает internal_free и external_free
    // Используем internal — там DocumentDir
    return Number(stat.internal_free) || 0
  } catch {
    return 0
  }
}

/** Информация о хранилище */
export interface StorageInfo {
  /** Занято скачанными файлами (байт) */
  downloadedBytes: number
  /** Занято постерами (байт) */
  posterCacheBytes: number
  /** Общий размер данных (байт) */
  totalUsedBytes: number
  /** Свободно на устройстве (байт) */
  availableBytes: number
}

/** Получить полную информацию о хранилище */
export async function getStorageInfo(): Promise<StorageInfo> {
  const [downloadedBytes, posterCacheBytes, totalUsedBytes, availableBytes] = await Promise.all([
    getDownloadedSize(),
    getPosterCacheSize(),
    getTotalStorageUsed(),
    getAvailableStorage(),
  ])

  return { downloadedBytes, posterCacheBytes, totalUsedBytes, availableBytes }
}

// --- Утилиты ---

// formatBytes перенесён в @letar/animatrona-shared
export { formatBytes } from '@letar/animatrona-shared'

/** Убедиться что родительская директория существует */
export async function ensureParentDir(filePath: string): Promise<void> {
  const parentDir = filePath.substring(0, filePath.lastIndexOf('/'))
  const exists = await fs.isDir(parentDir)
  if (!exists) {
    await fs.mkdir(parentDir)
  }
}

/** Очистить весь кэш animatrona */
export async function clearAllStorage(): Promise<void> {
  try {
    const exists = await fs.isDir(BASE_DIR)
    if (exists) {
      await fs.unlink(BASE_DIR)
    }
    // Пересоздать структуру
    await ensureDirectories()
  } catch (error) {
    console.error('[fileStorage] Ошибка очистки хранилища:', error)
  }
}
