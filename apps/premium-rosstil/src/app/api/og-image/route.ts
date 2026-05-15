import { existsSync, statSync } from 'fs'
import { readFile } from 'fs/promises'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join, resolve } from 'path'
import sharp from 'sharp'

// Максимальный размер файла — 10MB (защита от OOM)
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

/**
 * Проверка path traversal атак.
 * Возвращает true если путь безопасен.
 */
function isPathSafe(basePath: string, filePath: string): boolean {
  const resolvedPath = resolve(basePath, filePath)
  return resolvedPath.startsWith(resolve(basePath))
}

/**
 * API route для генерации OG изображений с кропом.
 * Оптимизировано для экономии памяти — буферы очищаются после использования.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const w = parseInt(searchParams.get('w') || '1200')
  const h = parseInt(searchParams.get('h') || '630')

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 })
  }

  // Переменные для буферов (для явной очистки)
  let imageBuffer: Buffer | null = null
  let croppedImage: Buffer | null = null

  try {
    const decodedUrl = decodeURIComponent(url)

    // Обрабатываем локальные файлы из /api/files/* чтением напрямую из директории uploads
    if (decodedUrl.startsWith('/api/files/')) {
      // Извлекаем путь после /api/files/
      const filePath = decodedUrl.replace('/api/files/', '')
      const uploadsDir = join(process.cwd(), 'uploads')
      const fullPath = join(uploadsDir, filePath)

      // Проверка path traversal (защита от ../../../etc/passwd)
      if (!isPathSafe(uploadsDir, filePath)) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
      }

      if (!existsSync(fullPath)) {
        return NextResponse.json({ error: 'Image not found' }, { status: 404 })
      }

      // Проверка размера файла
      const stats = statSync(fullPath)
      if (stats.size > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: 'Image too large' }, { status: 413 })
      }

      imageBuffer = await readFile(fullPath)
    } else {
      // Для внешних URL получаем через HTTP
      const imageUrl = decodedUrl.startsWith('/') ? new URL(decodedUrl, request.url).toString() : decodedUrl

      const imageResponse = await fetch(imageUrl)

      if (!imageResponse.ok) {
        return NextResponse.json({ error: 'Failed to fetch image' }, { status: imageResponse.status })
      }

      // Проверка Content-Length перед загрузкой
      const contentLength = imageResponse.headers.get('content-length')
      if (contentLength && parseInt(contentLength) > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: 'Image too large' }, { status: 413 })
      }

      const arrayBuffer = await imageResponse.arrayBuffer()
      // Дополнительная проверка размера после загрузки
      if (arrayBuffer.byteLength > MAX_IMAGE_SIZE) {
        return NextResponse.json({ error: 'Image too large' }, { status: 413 })
      }

      imageBuffer = Buffer.from(arrayBuffer)
    }

    // Обрабатываем изображение через sharp
    croppedImage = await sharp(imageBuffer)
      .resize(w, h, {
        fit: 'cover', // кроп по центру
        position: 'center',
      })
      .jpeg({ quality: 75 })
      .toBuffer()

    // Освобождаем оригинальный буфер — он больше не нужен
    imageBuffer = null

    // Создаём ответ (копируем данные в Uint8Array)
    const response = new NextResponse(new Uint8Array(croppedImage), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })

    // Освобождаем обработанный буфер
    croppedImage = null

    return response
  } catch (error) {
    // Освобождаем буферы в случае ошибки
    imageBuffer = null
    croppedImage = null

    console.error('Error processing image:', error)
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 })
  }
}
