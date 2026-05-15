import { existsSync, statSync } from 'fs'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join } from 'path'
import sharp from 'sharp'

// Лимиты для защиты от OOM
const MAX_OUTPUT_WIDTH = 2000
const MAX_OUTPUT_HEIGHT = 2000
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_EXTERNAL_FILE_SIZE = 5 * 1024 * 1024 // 5MB для внешних URL

/**
 * OG-image API — кропит изображение по центру для Open Graph
 * GET /api/og-image?url=<path>&w=1200&h=630
 *
 * Оптимизации памяти:
 * - Лимиты на размер output (max 2000x2000)
 * - Лимиты на размер файла (10MB локальные, 5MB внешние)
 * - Streaming для локальных файлов вместо readFile
 * - Агрессивное кэширование (1 год)
 *
 * @example
 * /api/og-image?url=/api/images/abc123 — из Image
 * /api/og-image?url=https://example.com/image.jpg — внешний URL
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
    const decodedUrl = decodeURIComponent(url)

    // Обрабатываем локальные файлы из /api/files/* или /api/images/*
    if (decodedUrl.startsWith('/api/files/') || decodedUrl.startsWith('/api/images/')) {
      // Извлекаем путь после /api/files/ или /api/images/
      const filePath = decodedUrl.replace(/^\/api\/(files|images)\//, '')
      const fullPath = join(process.cwd(), 'uploads', filePath)

      if (!existsSync(fullPath)) {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 })
      }

      // Проверяем размер файла
      const stats = statSync(fullPath)
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

    // Для внешних URL получаем через HTTP
    const imageUrl = decodedUrl.startsWith('/') ? new URL(decodedUrl, request.url).toString() : decodedUrl

    const imageResponse = await fetch(imageUrl)

    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: imageResponse.status })
    }

    // Проверяем Content-Length если доступен
    const contentLength = imageResponse.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_EXTERNAL_FILE_SIZE) {
      return NextResponse.json(
        { error: `External file too large. Max ${MAX_EXTERNAL_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      )
    }

    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())

    // Двойная проверка размера (на случай если Content-Length не был предоставлен)
    if (imageBuffer.length > MAX_EXTERNAL_FILE_SIZE) {
      return NextResponse.json(
        { error: `External file too large. Max ${MAX_EXTERNAL_FILE_SIZE / 1024 / 1024}MB` },
        { status: 413 }
      )
    }

    // Кроп по центру через Sharp
    const croppedImage = await sharp(imageBuffer)
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
  } catch (error) {
    console.error('Error processing OG image:', error)
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 })
  }
}
