import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join } from 'path'

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

    // Читаем файл
    const file = await readFile(filepath)

    // Определяем MIME-type по расширению
    const ext = path[path.length - 1].split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
    }

    const contentType = ext ? mimeTypes[ext] || 'application/octet-stream' : 'application/octet-stream'

    // Возвращаем файл с правильными заголовками
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
