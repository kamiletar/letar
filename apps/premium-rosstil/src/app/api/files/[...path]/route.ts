import { createReadStream } from 'fs'
import { stat } from 'fs/promises'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join, resolve } from 'path'
import { Readable } from 'stream'

/**
 * Проверка path traversal атак.
 * Декодирует URL-encoded символы и проверяет, что путь остаётся в пределах базовой директории.
 */
function isPathSafe(basePath: string, pathSegments: string[]): boolean {
  // Декодируем каждый сегмент для обнаружения %2e%2e и подобных
  const decodedSegments = pathSegments.map((s) => {
    try {
      return decodeURIComponent(s)
    } catch {
      return s
    }
  })

  // Проверяем на опасные паттерны (включая URL-encoded)
  for (const segment of decodedSegments) {
    if (segment.includes('..') || segment.includes('/') || segment.includes('\\')) {
      return false
    }
  }

  // Дополнительная проверка через resolve
  const resolvedPath = resolve(basePath, ...decodedSegments)
  return resolvedPath.startsWith(resolve(basePath))
}

/**
 * API route для сервинга загруженных файлов из папки uploads
 * Используется вместо прямого доступа через /public, так как Next.js
 * копирует public в .next/static при билде, и новые файлы недоступны
 *
 * Использует streaming для экономии памяти (не загружает файл целиком)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params
    const uploadsDir = join(process.cwd(), 'uploads')

    // Улучшенная проверка безопасности (защита от path traversal и URL encoding)
    if (!isPathSafe(uploadsDir, path)) {
      return new NextResponse('Invalid path', { status: 400 })
    }

    // Формируем путь к файлу
    const filepath = join(uploadsDir, ...path)

    // Проверяем существование файла и получаем статистику (async вместо sync)
    let fileStat
    try {
      fileStat = await stat(filepath)
    } catch {
      return new NextResponse('File not found', { status: 404 })
    }

    // Проверяем что это файл, а не директория
    if (!fileStat.isFile()) {
      return new NextResponse('Not a file', { status: 400 })
    }

    // Определяем MIME-type по расширению
    const ext = path[path.length - 1].split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
    }

    const contentType = ext ? mimeTypes[ext] || 'application/octet-stream' : 'application/octet-stream'

    // Создаём поток чтения файла (streaming вместо readFile для экономии памяти)
    const nodeStream = createReadStream(filepath)

    // Конвертируем Node.js stream в Web ReadableStream
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>

    // Возвращаем поток с правильными заголовками
    return new NextResponse(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('[Files API] Error serving file:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
