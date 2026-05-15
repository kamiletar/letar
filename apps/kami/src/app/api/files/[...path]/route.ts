import { existsSync, statSync } from 'fs'
import { open, readFile } from 'fs/promises'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join } from 'path'

/** MIME-типы по расширению */
const mimeTypes: Record<string, string> = {
  // Изображения
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  avif: 'image/avif',
  // Аудио
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
}

/** Расширения аудиофайлов — для них нужна поддержка Range requests */
const audioExtensions = new Set(['mp3', 'ogg', 'wav', 'm4a'])

/**
 * API route для сервинга загруженных файлов из папки uploads
 * Используется вместо прямого доступа через /public, так как Next.js
 * копирует public в .next/static при билде, и новые файлы недоступны
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params

    // Проверка безопасности: не позволяем выходить за пределы uploads
    if (path.some((segment) => segment.includes('..') || segment.includes('/'))) {
      return new NextResponse('Invalid path', { status: 400 })
    }

    // Формируем путь к файлу
    const filepath = join(process.cwd(), 'uploads', ...path)

    // Проверяем существование файла
    if (!existsSync(filepath)) {
      return new NextResponse('File not found', { status: 404 })
    }

    // Определяем MIME-type по расширению
    const ext = path[path.length - 1].split('.').pop()?.toLowerCase()
    const contentType = ext ? mimeTypes[ext] || 'application/octet-stream' : 'application/octet-stream'
    const isAudio = ext ? audioExtensions.has(ext) : false

    // Для аудио — поддержка Range requests (seek в плеере)
    if (isAudio) {
      const stat = statSync(filepath)
      const fileSize = stat.size
      const rangeHeader = request.headers.get('range')

      if (rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
        const chunkSize = end - start + 1

        // Читаем только запрошенный диапазон
        const fd = await open(filepath, 'r')
        const buffer = Buffer.alloc(chunkSize)
        await fd.read(buffer, 0, chunkSize, start)
        await fd.close()

        return new NextResponse(buffer, {
          status: 206,
          headers: {
            'Content-Type': contentType,
            'Content-Length': String(chunkSize),
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      }

      // Полный файл — но с Accept-Ranges заголовком
      const file = await readFile(filepath)
      return new NextResponse(file, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(fileSize),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    // Обычные файлы (изображения и т.д.)
    const file = await readFile(filepath)
    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('[Files API] Error serving file:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
