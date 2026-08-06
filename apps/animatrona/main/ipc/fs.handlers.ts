/**
 * IPC handlers для работы с файловой системой
 */

import { nativeImage, shell } from 'electron'
import { existsSync } from 'fs'
import { copyFile, mkdir, readdir, rm, stat } from 'fs/promises'
import path from 'path'
import { allowPath } from '../protocols/allowed-paths'
import { type ExternalAudioScanResult, scanForExternalAudio } from '../services/external-audio-scanner'
import { type ExternalSubtitleScanResult, scanForExternalSubtitles } from '../services/external-subtitle-scanner'
import { getDefaultLibraryPath } from '../services/output-path-resolver'
import { createHandler } from '../utils/ipc-handler-factory'

/**
 * Проверяет что путь находится внутри библиотеки
 * Использует path.resolve() для защиты от path traversal (../)
 *
 * КРИТИЧЕСКАЯ ФУНКЦИЯ БЕЗОПАСНОСТИ:
 * Предотвращает удаление файлов вне папки библиотеки
 */
function isPathInsideLibrary(targetPath: string): { safe: boolean; reason?: string } {
  const libraryPath = getDefaultLibraryPath()
  const resolvedTarget = path.resolve(targetPath)
  const resolvedLibrary = path.resolve(libraryPath)

  // Запретить удаление самой библиотеки
  if (resolvedTarget === resolvedLibrary) {
    return { safe: false, reason: 'Нельзя удалить корень библиотеки' }
  }

  // Путь должен начинаться с libraryPath + разделитель
  if (!resolvedTarget.startsWith(resolvedLibrary + path.sep)) {
    return { safe: false, reason: `Путь "${resolvedTarget}" вне библиотеки "${resolvedLibrary}"` }
  }

  return { safe: true }
}

/** Информация о медиафайле */
interface MediaFileInfo {
  path: string
  name: string
  size: number
  extension: string
}

/** Типы медиафайлов */
type MediaType = 'video' | 'audio'

/** Расширения по типам медиа */
const EXTENSIONS_BY_TYPE: Record<MediaType, Set<string>> = {
  video: new Set(['.mkv', '.mp4', '.avi', '.webm', '.mov', '.wmv', '.flv', '.m4v']),
  audio: new Set(['.mka', '.m4a', '.flac', '.opus', '.mp3', '.aac', '.wav', '.ogg', '.ac3', '.dts']),
}

/**
 * Регистрирует IPC handlers для файловой системы
 */
export function registerFsHandlers(): void {
  // Сканирование папки на медиафайлы
  createHandler('fs:scanFolder', async (folderPath: string, recursive = true, mediaTypes: MediaType[] = ['video']) => {
    // Добавляем папку в whitelist для media:// протокола
    allowPath(folderPath)
    const files = await scanFolderForMedia(folderPath, recursive, mediaTypes)
    return { files }
  })

  // Удаление файла или папки
  createHandler('fs:delete', async (targetPath: string, moveToTrash = true) => {
    // КРИТИЧЕСКАЯ ЗАЩИТА: Проверка что путь в библиотеке
    const { safe, reason } = isPathInsideLibrary(targetPath)
    if (!safe) {
      throw new Error(reason)
    }

    if (!existsSync(targetPath)) {
      return
    }

    if (moveToTrash) {
      await shell.trashItem(targetPath)
    } else {
      await rm(targetPath, { recursive: true, force: true })
    }
  })

  // Проверка существования пути
  createHandler('fs:exists', (targetPath: string) => existsSync(targetPath))

  // Получение информации о файле (размер, дата)
  createHandler('fs:stat', async (filePath: string) => {
    const stats = await stat(filePath)
    return { size: stats.size, mtime: stats.mtime }
  })

  // Копирование файла
  createHandler('fs:copyFile', async (sourcePath: string, destPath: string) => {
    await mkdir(path.dirname(destPath), { recursive: true })
    await copyFile(sourcePath, destPath)
  })

  // Сканирование внешних субтитров
  createHandler(
    'fs:scanExternalSubtitles',
    (
      videoFolderPath: string,
      videoFiles: Array<{ path: string; episodeNumber: number }>,
    ): Promise<ExternalSubtitleScanResult> => scanForExternalSubtitles(videoFolderPath, videoFiles),
  )

  // Сканирование внешних аудиодорожек
  createHandler(
    'fs:scanExternalAudio',
    (
      videoFolderPath: string,
      videoFiles: Array<{ path: string; episodeNumber: number }>,
    ): Promise<ExternalAudioScanResult> => scanForExternalAudio(videoFolderPath, videoFiles),
  )

  // Получение метаданных изображения (размеры, blur placeholder)
  createHandler('fs:getImageMetadata', async (filePath: string) => {
    if (!existsSync(filePath)) {
      throw new Error('Файл не существует')
    }

    const stats = await stat(filePath)
    const image = nativeImage.createFromPath(filePath)

    if (image.isEmpty()) {
      throw new Error('Не удалось загрузить изображение')
    }

    const { width, height } = image.getSize()

    // Генерируем blur placeholder (10x10px JPEG в base64)
    const blurImage = image.resize({ width: 10, height: 10, quality: 'low' })
    const blurBuffer = blurImage.toJPEG(50)
    const blurDataURL = `data:image/jpeg;base64,${blurBuffer.toString('base64')}`

    // Определяем MIME тип по расширению
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    }
    const mimeType = mimeTypes[ext] || 'image/jpeg'

    return {
      width,
      height,
      size: stats.size,
      mimeType,
      blurDataURL,
    }
  })
}

/**
 * Рекурсивно сканирует папку на медиафайлы указанных типов
 */
async function scanFolderForMedia(
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
    console.error(`[FS] scanFolderForMedia: не удалось прочитать ${folderPath}:`, err)
  }

  return results
}
