/**
 * Кастомный протокол для воспроизведения локальных медиафайлов
 *
 * Регистрирует протокол media:// для безопасного доступа к локальным файлам
 * Пример: media://C:/videos/anime.mkv
 */

import { protocol } from 'electron'
import { createReadStream } from 'fs'
import { stat as fsStat } from 'fs/promises'
import path from 'path'
import type { Readable } from 'stream'

import { createModuleLogger } from '../utils/logger'
import { isPathAllowed } from './allowed-paths'

const log = createModuleLogger('MediaProtocol')

/** Поддерживаемые MIME-типы для видео */
const VIDEO_MIME_TYPES: Record<string, string> = {
  '.mkv': 'video/x-matroska',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mov': 'video/quicktime',
  '.m4v': 'video/mp4',
  '.ogv': 'video/ogg',
}

/** Поддерживаемые MIME-типы для аудио */
const AUDIO_MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.mka': 'audio/x-matroska', // Matroska Audio
}

/** Поддерживаемые MIME-типы для субтитров */
const SUBTITLE_MIME_TYPES: Record<string, string> = {
  '.vtt': 'text/vtt',
  '.srt': 'text/srt',
  '.ass': 'text/x-ssa',
  '.ssa': 'text/x-ssa',
}

/** Поддерживаемые MIME-типы для шрифтов (для ASS субтитров) */
const FONT_MIME_TYPES: Record<string, string> = {
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

/** Поддерживаемые MIME-типы для изображений */
const IMAGE_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
}

/**
 * Получить MIME-тип по расширению файла
 */
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  return (
    VIDEO_MIME_TYPES[ext]
    || AUDIO_MIME_TYPES[ext]
    || SUBTITLE_MIME_TYPES[ext]
    || FONT_MIME_TYPES[ext]
    || IMAGE_MIME_TYPES[ext]
    || 'application/octet-stream'
  )
}

/**
 * Парсит Range заголовок
 */
function parseRange(range: string, fileSize: number): { start: number; end: number } | null {
  const match = range.match(/bytes=(\d*)-(\d*)/)
  if (!match) {
    return null
  }

  const start = match[1] ? parseInt(match[1], 10) : 0
  const end = match[2] ? parseInt(match[2], 10) : fileSize - 1

  // Валидация
  if (start >= fileSize || end >= fileSize || start > end) {
    return null
  }

  return { start, end }
}

/**
 * Конвертирует Node.js stream в Web ReadableStream
 */
function nodeStreamToWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => {
        controller.enqueue(chunk)
      })
      nodeStream.on('end', () => {
        controller.close()
      })
      nodeStream.on('error', (err) => {
        controller.error(err)
      })
    },
    cancel() {
      nodeStream.destroy()
    },
  })
}

/**
 * Обработчик запросов к media:// протоколу
 */
async function handleMediaRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)

  // Декодируем путь к файлу из URL
  // URL парсер интерпретирует media://C:/path как hostname='c', pathname='/path'
  // Восстанавливаем Windows путь: hostname (буква диска) + pathname
  let filePath: string
  if (url.hostname && url.hostname.length === 1) {
    // Windows путь: hostname = буква диска (c), pathname = /Users/path/file.mkv
    // Результат: C:/Users/path/file.mkv
    filePath = `${url.hostname.toUpperCase()}:${decodeURIComponent(url.pathname)}`
  } else {
    // Unix путь или уже правильный формат
    filePath = decodeURIComponent(url.pathname)
    // Убираем начальный слеш если путь начинается с буквы диска (fallback)
    if (filePath.match(/^\/[A-Za-z]:\//)) {
      filePath = filePath.slice(1)
    }
  }

  // Если путь — HTTP URL (например, IPFS gateway), перенаправляем на оригинальный URL
  // Это происходит когда SubtitlesOctopus или другой компонент создаёт media://http://...
  if (filePath.startsWith('//') || filePath.startsWith('http://') || filePath.startsWith('https://')) {
    const httpUrl = filePath.startsWith('//') ? `http:${filePath}` : filePath
    log.warn('Redirecting HTTP URL from media://', { url: httpUrl })
    try {
      return await fetch(httpUrl, {
        headers: request.headers,
      })
    } catch (error) {
      log.error('Failed to proxy HTTP URL', { url: httpUrl, error })
      return new Response('Failed to fetch', { status: 502 })
    }
  }

  // Проверяем whitelist — защита от произвольного чтения файлов
  if (!isPathAllowed(filePath)) {
    log.error('Access denied (not in whitelist)', { path: filePath })
    return new Response('Access denied', { status: 403 })
  }

  // Проверяем существование файла и получаем размер (async — не блокируем main thread)
  let fileSize: number
  try {
    const fileStat = await fsStat(filePath)
    fileSize = fileStat.size
  } catch {
    log.error('File not found', { path: filePath })
    return new Response('File not found', { status: 404 })
  }

  try {
    const mimeType = getMimeType(filePath)

    // Обработка Range запросов для стриминга
    const rangeHeader = request.headers.get('range')

    if (rangeHeader) {
      const range = parseRange(rangeHeader, fileSize)

      if (!range) {
        return new Response('Requested range not satisfiable', {
          status: 416,
          headers: {
            'Content-Range': `bytes */${fileSize}`,
          },
        })
      }

      const { start, end } = range
      const chunkSize = end - start + 1

      const stream = createReadStream(filePath, { start, end })

      return new Response(nodeStreamToWebStream(stream), {
        status: 206,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': String(chunkSize),
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache',
        },
      })
    }

    // Полный файл (без Range)
    const stream = createReadStream(filePath)

    return new Response(nodeStreamToWebStream(stream), {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    log.error('Error reading file', { error })
    return new Response('Internal server error', { status: 500 })
  }
}

/**
 * Регистрирует кастомный протокол media://
 * Должен вызываться ПЕРЕД app.whenReady()
 */
export function registerMediaProtocol(): void {
  // Указываем Electron что протокол поддерживает стандартные схемы (fetch, Range headers)
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'media',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true,
        corsEnabled: true,
      },
    },
  ])
}

/**
 * Настраивает обработчик запросов для media:// протокола
 * Должен вызываться ПОСЛЕ app.whenReady()
 */
export function setupMediaProtocolHandler(): void {
  protocol.handle('media', handleMediaRequest)
}
