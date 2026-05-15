import { getImageById, getImageUrl } from '@/lib/images/create-image'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * API endpoint для получения информации об изображении в JSON формате.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const image = await getImageById(id)

    if (!image) {
      return NextResponse.json({ error: 'Изображение не найдено' }, { status: 404 })
    }

    return NextResponse.json({
      id: image.id,
      filename: image.filename,
      path: image.path,
      url: getImageUrl(image.path),
      mimeType: image.mimeType,
      size: image.size,
      width: image.width,
      height: image.height,
      category: image.category,
      uploadedById: image.uploadedById,
      uploadedAt: image.uploadedAt,
    })
  } catch (error) {
    console.error('Get image info error:', error)
    return NextResponse.json({ error: 'Ошибка при получении информации об изображении' }, { status: 500 })
  }
}
