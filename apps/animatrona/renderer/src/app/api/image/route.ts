/**
 * API Route для сервинга локальных изображений
 *
 * Next.js Image Optimization работает с этим route,
 * позволяя использовать fill, sizes, и автоматический resize.
 *
 * Использование: /api/image?path=C:/path/to/image.jpg
 */

import { existsSync, readFileSync } from 'fs'
import { type NextRequest, NextResponse } from 'next/server'
import { extname } from 'path'

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const filePath = searchParams.get('path')

  if (!filePath) {
    return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 })
  }

  // Декодируем путь (может содержать кириллицу)
  const decodedPath = decodeURIComponent(filePath)

  // Проверяем существование файла
  if (!existsSync(decodedPath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  // Определяем MIME type
  const ext = extname(decodedPath).toLowerCase()
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream'

  // Читаем файл
  const buffer = readFileSync(decodedPath)

  // Возвращаем с правильными заголовками для кэширования
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
