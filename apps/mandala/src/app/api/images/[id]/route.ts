import { getImageById, getImageUrl } from '@/lib/images/create-image'
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
      category: image.category,
    })
  } catch (error) {
    console.error('Error fetching image:', error)
    return NextResponse.json({ error: 'Ошибка при получении изображения' }, { status: 500 })
  }
}
