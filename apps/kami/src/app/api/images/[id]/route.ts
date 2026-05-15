import { getImageById, getImageUrl } from '@/lib/images'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

type Params = Promise<{ id: string }>

/**
 * GET /api/images/[id]
 * Возвращает информацию об изображении по ID
 */
export async function GET(_request: NextRequest, { params }: { params: Params }) {
  const { id } = await params

  try {
    const image = await getImageById(id)

    if (!image) {
      return NextResponse.json({ error: 'Изображение не найдено' }, { status: 404 })
    }

    return NextResponse.json({
      id: image.id,
      url: getImageUrl(image.path),
      filename: image.filename,
      mimeType: image.mimeType,
      size: image.size,
      width: image.width,
      height: image.height,
      blurDataURL: image.blurDataURL,
      category: image.category,
      uploadedAt: image.uploadedAt,
    })
  } catch (error) {
    console.error('[Images API] Error fetching image:', error)
    return NextResponse.json({ error: 'Ошибка при получении изображения' }, { status: 500 })
  }
}
