import { getImageById, getImageUrl } from '@/lib/images/create-image'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * API endpoint для получения изображения по ID.
 * Редиректит на /api/files/{path} для сервирования файла.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const image = await getImageById(id)

    if (!image) {
      return NextResponse.json({ error: 'Изображение не найдено' }, { status: 404 })
    }

    // Редирект на файловый API
    const url = getImageUrl(image.path)
    return NextResponse.redirect(new URL(url, request.url))
  } catch (error) {
    console.error('Get image error:', error)
    return NextResponse.json({ error: 'Ошибка при получении изображения' }, { status: 500 })
  }
}

/**
 * API endpoint для получения метаданных изображения по ID.
 */
export async function HEAD(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const image = await getImageById(id)

    if (!image) {
      return new NextResponse(null, { status: 404 })
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': image.mimeType,
        'Content-Length': image.size.toString(),
        'X-Image-Width': image.width?.toString() ?? '',
        'X-Image-Height': image.height?.toString() ?? '',
        'X-Image-Category': image.category,
      },
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
