/**
 * Утилиты для работы с файловой системой
 */

import { readdir } from 'fs/promises'
import path from 'path'

import { createModuleLogger } from './logger'

const log = createModuleLogger('FsUtils')

/**
 * Рекурсивный генератор файлов в директории
 *
 * @param dir - Начальная директория
 * @param extensions - Набор расширений для фильтрации (с точкой, например '.ass')
 * @param maxDepth - Максимальная глубина рекурсии (по умолчанию 3)
 * @yields Полный путь к найденному файлу
 *
 * @example
 * ```typescript
 * const SUBTITLE_EXTENSIONS = new Set(['.ass', '.srt', '.vtt'])
 * for await (const filePath of scanDirectoryRecursive(subsDir, SUBTITLE_EXTENSIONS)) {
 *   console.log('Found:', filePath)
 * }
 * ```
 */
export async function* scanDirectoryRecursive(
  dir: string,
  extensions: Set<string>,
  maxDepth = 3,
  currentDepth = 0,
): AsyncGenerator<string> {
  if (currentDepth > maxDepth) {
    return
  }

  try {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)

      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (extensions.has(ext)) {
          yield fullPath
        }
      } else if (entry.isDirectory()) {
        // Рекурсивно сканируем подпапки
        yield* scanDirectoryRecursive(fullPath, extensions, maxDepth, currentDepth + 1)
      }
    }
  } catch (e) {
    log.warn(`Cannot read directory: ${dir}`, { error: e })
  }
}

/**
 * Собрать все файлы из генератора в массив
 *
 * @param generator - Async generator файлов
 * @returns Массив путей к файлам
 */
export async function collectFiles(generator: AsyncGenerator<string>): Promise<string[]> {
  const files: string[] = []
  for await (const file of generator) {
    files.push(file)
  }
  return files
}
