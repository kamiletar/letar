'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Server action для сохранения загруженных изображений в базу данных.
 * Загрузка файлов происходит через /api/upload на клиенте.
 */
export async function saveVariantImages(
  productId: string,
  variantId: string,
  images: Array<{ imageId: string; alt?: string }>
) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  try {
    // Получаем максимальный order для данного варианта
    const lastImage = await db.variantImage.findFirst({
      where: { variantId },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const startOrder = (lastImage?.order ?? -1) + 1

    // Создаем записи для всех изображений последовательно,
    // чтобы избежать race condition с order
    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      await db.variantImage.create({
        data: {
          variantId,
          imageId: img.imageId,
          alt: img.alt || '',
          order: startOrder + i,
        },
      })
    }
  } catch (error) {
    console.error('Failed to save variant images:', error)
    throw new Error('Не удалось сохранить изображения', { cause: error })
  }

  revalidatePath(`/admin/products/${productId}/edit`)
}
