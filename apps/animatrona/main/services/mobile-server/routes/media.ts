/**
 * Media streaming route для Mobile Server
 *
 * Переиспользует логику из media.protocol.ts для стриминга видео
 * с поддержкой Range requests для seek.
 */

import { createReadStream, existsSync, statSync } from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'
import path from 'path'

import { createModuleLogger } from '../../../utils/logger'
import { parseRange } from '../utils'

const log = createModuleLogger('MobileMedia')

/** Поддерживаемые MIME-типы для видео */
const VIDEO_MIME_TYPES: Record<string, string> = {
  '.mkv': 'video/x-matroska',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
}

/** Поддерживаемые MIME-типы для аудио */
const AUDIO_MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.mka': 'audio/x-matroska',
}

/** Поддерживаемые MIME-типы для субтитров */
const SUBTITLE_MIME_TYPES: Record<string, string> = {
  '.vtt': 'text/vtt',
  '.srt': 'text/srt',
  '.ass': 'text/x-ssa',
  '.ssa': 'text/x-ssa',
}

/**
 * Получить MIME-тип по расширению файла
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return VIDEO_MIME_TYPES[ext] || AUDIO_MIME_TYPES[ext] || SUBTITLE_MIME_TYPES[ext] || 'application/octet-stream'
}

/**
 * Проверить, разрешён ли доступ к файлу
 * Для безопасности разрешаем только файлы в папке библиотеки
 */
async function isPathAllowed(filePath: string): Promise<boolean> {
  // Импортируем динамически чтобы избежать циклических зависимостей
  const { getDb } = await import('../../database.js')
  const db = getDb()

  const settings = await db.settings.findUnique({ where: { id: 'default' } })
  const libraryPath = settings?.libraryPath

  if (!libraryPath) {
    log.warn('Library path not set')
    return false
  }

  // Нормализуем пути для сравнения
  const normalizedFilePath = path.normalize(filePath).toLowerCase()
  const normalizedLibraryPath = path.normalize(libraryPath).toLowerCase()

  // Проверяем что файл находится внутри библиотеки
  return normalizedFilePath.startsWith(normalizedLibraryPath)
}

/**
 * Обработка запроса на стриминг медиафайла
 */
export async function handleMediaRequest(req: IncomingMessage, res: ServerResponse, filePath: string): Promise<void> {
  // Декодируем путь
  const decodedPath = decodeURIComponent(filePath)

  // Проверяем whitelist — защита от произвольного чтения файлов
  const allowed = await isPathAllowed(decodedPath)
  if (!allowed) {
    log.error('Access denied (not in library)', { path: decodedPath })
    res.writeHead(403, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Access denied' }))
    return
  }

  // Проверяем существование файла
  if (!existsSync(decodedPath)) {
    log.error('File not found', { path: decodedPath })
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'File not found' }))
    return
  }

  try {
    const stat = statSync(decodedPath)
    const fileSize = stat.size
    const mimeType = getMimeType(decodedPath)

    // Обработка Range запросов для стриминга
    const rangeHeader = req.headers.range

    if (rangeHeader) {
      const range = parseRange(rangeHeader, fileSize)

      if (!range) {
        res.writeHead(416, {
          'Content-Range': `bytes */${fileSize}`,
        })
        res.end('Requested range not satisfiable')
        return
      }

      const { start, end } = range
      const chunkSize = end - start + 1

      log.debug('Serving range request', {
        path: decodedPath,
        start,
        end,
        chunkSize,
        fileSize,
      })

      res.writeHead(206, {
        'Content-Type': mimeType,
        'Content-Length': chunkSize,
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      })

      const stream = createReadStream(decodedPath, { start, end })
      // Уничтожаем stream при закрытии клиентского соединения (seek/disconnect)
      res.on('close', () => stream.destroy())
      stream.pipe(res)
      return
    }

    // Полный файл (без Range)
    log.debug('Serving full file', { path: decodedPath, fileSize })

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': fileSize,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    })

    const stream = createReadStream(decodedPath)
    res.on('close', () => stream.destroy())
    stream.pipe(res)
  } catch (error) {
    log.error('Error streaming file', { error: String(error) })
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  }
}
