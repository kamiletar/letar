/**
 * Резолвер путей для выходных файлов
 *
 * Генерирует структуру папок библиотеки:
 * [libraryPath]/[Anime Name]/Season [N]/Episode [M]/
 *   ├── video.mkv
 *   ├── audio_0_rus.m4a
 *   ├── audio_1_jpn.m4a
 *   ├── subs_0_rus.ass
 *   └── manifest.json
 */

import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

/** Опции для генерации пути */
export interface OutputPathOptions {
  /** Базовая папка библиотеки (Settings.outputPath) */
  libraryPath: string
  /** Название аниме */
  animeName: string
  /** Номер сезона */
  seasonNumber: number
  /** Номер эпизода */
  episodeNumber: number
}

/** Пути к файлам эпизода */
export interface EpisodePaths {
  /** Папка эпизода */
  episodeDir: string
  /** Путь к видео файлу */
  videoPath: string
  /** Путь к манифесту */
  manifestPath: string
  /** Генератор пути для аудиодорожки */
  audioPath: (index: number, language: string) => string
  /** Генератор пути для субтитров */
  subtitlePath: (index: number, language: string, format: string) => string
}

/**
 * Очищает имя от недопустимых символов файловой системы
 *
 * @param name - Исходное имя
 * @returns Безопасное имя для использования в путях
 */
export function sanitizeFileName(name: string): string {
  return (
    name
      // Недопустимые символы Windows и Unix
      .replace(/[<>:"/\\|?*]/g, '_')
      // Контрольные символы (eslint-disable-next-line no-control-regex)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1f\x7f]/g, '')
      // Множественные пробелы и подчёркивания
      .replace(/[_\s]+/g, ' ')
      // Точки в начале и конце (проблема Windows)
      .replace(/^\.+|\.+$/g, '')
      .trim()
  )
}

/**
 * Генерирует путь к папке эпизода
 *
 * Структура: [libraryPath]/[Anime Name]/Season [N]/Episode [M]/
 *
 * @param options - Опции генерации
 * @returns Полный путь к папке эпизода
 */
export function resolveOutputPath(options: OutputPathOptions): string {
  const { libraryPath, animeName, seasonNumber, episodeNumber } = options

  const safeAnimeName = sanitizeFileName(animeName)

  // Защита от пустого имени
  if (!safeAnimeName) {
    throw new Error('Имя аниме не может быть пустым после очистки')
  }

  return path.join(libraryPath, safeAnimeName, `Season ${seasonNumber}`, `Episode ${episodeNumber}`)
}

/**
 * Генерирует все пути для эпизода
 *
 * @param options - Опции генерации
 * @returns Объект с путями
 */
export function resolveEpisodePaths(options: OutputPathOptions): EpisodePaths {
  const episodeDir = resolveOutputPath(options)

  return {
    episodeDir,
    videoPath: path.join(episodeDir, 'video.mkv'),
    manifestPath: path.join(episodeDir, 'manifest.json'),
    audioPath: (index: number, language: string) =>
      path.join(episodeDir, `audio_${index}_${sanitizeFileName(language)}.m4a`),
    subtitlePath: (index: number, language: string, format: string) =>
      path.join(episodeDir, `subs_${index}_${sanitizeFileName(language)}.${format}`),
  }
}

/**
 * Получает путь к библиотеке по умолчанию
 *
 * @returns Путь к папке Videos/Animatrona
 */
export function getDefaultLibraryPath(): string {
  return path.join(app.getPath('videos'), 'Animatrona')
}

/**
 * Создаёт структуру папок для эпизода
 *
 * @param options - Опции генерации
 * @returns Путь к созданной папке
 */
export async function ensureEpisodeDirectory(options: OutputPathOptions): Promise<string> {
  const episodeDir = resolveOutputPath(options)
  await fs.promises.mkdir(episodeDir, { recursive: true })
  return episodeDir
}

/**
 * Создаёт папку для аниме (для хранения постера и других общих файлов)
 *
 * Структура: [libraryPath]/[Anime Name]/
 *
 * @param libraryPath - Путь к библиотеке
 * @param animeName - Название аниме
 * @returns Путь к созданной папке
 */
export async function ensureAnimeDirectory(libraryPath: string, animeName: string): Promise<string> {
  const safeAnimeName = sanitizeFileName(animeName)

  if (!safeAnimeName) {
    throw new Error('Имя аниме не может быть пустым после очистки')
  }

  const animeDir = path.join(libraryPath, safeAnimeName)
  await fs.promises.mkdir(animeDir, { recursive: true })
  return animeDir
}

/**
 * Проверяет существование папки библиотеки
 *
 * @param libraryPath - Путь к библиотеке
 * @returns true если папка существует
 */
export function libraryExists(libraryPath: string): boolean {
  try {
    return fs.existsSync(libraryPath) && fs.statSync(libraryPath).isDirectory()
  } catch {
    return false
  }
}

/**
 * Получает список аниме в библиотеке
 *
 * @param libraryPath - Путь к библиотеке
 * @returns Массив имён аниме
 */
export async function listAnimeInLibrary(libraryPath: string): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(libraryPath, { withFileTypes: true })
    return entries.filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return []
  }
}

/**
 * Получает информацию о свободном месте на диске
 * Использует Node.js fs.statfs (доступен с Node.js 18.15+)
 *
 * @param targetPath - Путь для проверки
 * @returns Свободное место в байтах или undefined при ошибке
 */
export async function getFreeDiskSpace(targetPath: string): Promise<number | undefined> {
  try {
    const stats = await fs.promises.statfs(targetPath)
    return stats.bfree * stats.bsize // bfree — свободные блоки
  } catch {
    return undefined
  }
}

/**
 * Проверяет, достаточно ли места для файла
 *
 * @param targetPath - Целевой путь
 * @param requiredBytes - Требуемое место в байтах
 * @returns true если места достаточно или не удалось проверить
 */
export async function hasEnoughSpace(targetPath: string, requiredBytes: number): Promise<boolean> {
  const freeSpace = await getFreeDiskSpace(targetPath)
  if (freeSpace === undefined) {
    return true // Не можем проверить, предполагаем что места хватит
  }
  return freeSpace > requiredBytes * 1.1 // Запас 10%
}
