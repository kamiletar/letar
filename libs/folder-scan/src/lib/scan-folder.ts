/**
 * Рекурсивное сканирование папки на медиафайлы указанных типов (видео/аудио)
 */

import { readdir, stat } from 'fs/promises'
import path from 'path'

/** Информация о медиафайле */
export interface MediaFileInfo {
  path: string
  name: string
  size: number
  extension: string
}

/** Типы медиафайлов */
export type MediaType = 'video' | 'audio'

/** Расширения по типам медиа */
const EXTENSIONS_BY_TYPE: Record<MediaType, Set<string>> = {
  video: new Set(['.mkv', '.mp4', '.avi', '.webm', '.mov', '.wmv', '.flv', '.m4v']),
  audio: new Set(['.mka', '.m4a', '.flac', '.opus', '.mp3', '.aac', '.wav', '.ogg', '.ac3', '.dts']),
}

/**
 * Рекурсивно сканирует папку на медиафайлы указанных типов
 */
export async function scanFolderForMedia(
  folderPath: string,
  recursive: boolean,
  mediaTypes: MediaType[],
): Promise<MediaFileInfo[]> {
  const results: MediaFileInfo[] = []

  // Собираем все нужные расширения из указанных типов
  const allowedExtensions = new Set<string>()
  for (const type of mediaTypes) {
    for (const ext of EXTENSIONS_BY_TYPE[type]) {
      allowedExtensions.add(ext)
    }
  }

  try {
    const entries = await readdir(folderPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(folderPath, entry.name)

      if (entry.isDirectory() && recursive) {
        // Рекурсивно сканируем поддиректории
        const subResults = await scanFolderForMedia(fullPath, recursive, mediaTypes)
        results.push(...subResults)
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase()
        if (allowedExtensions.has(ext)) {
          try {
            const stats = await stat(fullPath)
            results.push({
              path: fullPath,
              name: entry.name,
              size: stats.size,
              extension: ext,
            })
          } catch {
            // Не удалось получить stat файла — пропускаем
          }
        }
      }
    }
  } catch (err) {
    // Ошибка чтения директории — логируем и возвращаем пустой массив
    console.error(`[FolderScan] scanFolderForMedia: не удалось прочитать ${folderPath}:`, err)
  }

  return results
}
