import { resolveUploadPath } from '@letar/image-upload/server'
import { statSync } from 'fs'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join } from 'path'
import sharp from 'sharp'

// Лимиты для защиты от OOM
const MAX_OUTPUT_WIDTH = 2000
const MAX_OUTPUT_HEIGHT = 2000
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * OG-image API — кропит изображение по центру для Open Graph
 * GET /api/og-image?url=<path>&w=1200&h=630
 *
 * Принимает только локальные пути (/api/files/*, /api/images/*). Ветка внешних
 * URL была удалена — она без авторизации делала fetch на любой переданный адрес
 * (SSRF: localhost, метаданные облака, внутренняя сеть), а оба вызывающих места
 * (mandalas/[slug], shop/[slug]) всегда передают только getImageUrl() — локальный путь.
 *
 * Оптимизации памяти:
 * - Лимиты на размер output (max 2000x2000)
 * - Лимиты на размер файла (10MB)
 * - Streaming для локальных файлов вместо readFile
 * - Агрессивное кэширование (1 год)
 *
 * @example
 * /api/og-image?url=/api/images/abc123 — из Image
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const w = Math.min(parseInt(searchParams.get('w') || '1200'), MAX_OUTPUT_WIDTH)
  const h = Math.min(parseInt(searchParams.get('h') || '630'), MAX_OUTPUT_HEIGHT)

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  try {
    // `url` намеренно используется как есть: `searchParams.get` уже вернул
    // раскодированное значение. Лишний decodeURIComponent превращал `%252e%252e%252f`
    // в `../` и ронял 500 на одиночном `%` — оба случая просто не должны возникать.

    // Обрабатываем локальные файлы из /api/files/* или /api/images/*
    if (url.startsWith('/api/files/') || url.startsWith('/api/images/')) {
      // Извлекаем путь после /api/files/ или /api/images/
      const filePath = url.replace(/^\/api\/(files|images)\//, '')

      // Проверки префикса недостаточно: `/api/files/../../secret.jpg` её проходит,
      // а `join` послушно уходит за пределы uploads/. Нормализуем путь и убеждаемся,
      // что результат остался внутри корня — та же защита, что в @letar/image-upload/server.
      const resolved = resolveUploadPath(join(process.cwd(), 'uploads'), filePath.split('/'))
      if (!resolved.ok) {
        return resolved.reason === 'traversal'
          ? NextResponse.json({ error: 'Forbidden' }, { status: 403 })
          : NextResponse.json({ error: 'Bad request' }, { status: 400 })
      }

      const fullPath = resolved.absPath

      let stats
      try {
        stats = statSync(fullPath)
      } catch {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 })
      }

      // Каталог — это не ошибка сервера, а именно отсутствие картинки.
      if (!stats.isFile()) {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 })
      }

      // Проверяем размер файла
      if (stats.size > MAX_FILE_SIZE) {
        return NextResponse.json({ error: `File too large. Max ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 413 })
      }

      // Sharp принимает путь к файлу напрямую — более эффективно по памяти
      const croppedImage = await sharp(fullPath)
        .resize(w, h, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 75 })
        .toBuffer()

      return new NextResponse(new Uint8Array(croppedImage), {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    // Внешние URL не поддерживаются — только /api/files/* и /api/images/*
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  } catch (error) {
    console.error('Error processing OG image:', error)
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 })
  }
}
