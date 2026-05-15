'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { unlink } from 'fs/promises'
import { join } from 'path'

const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads'

// Тип изображения с подсчётом связей
type ImageWithCount = {
  id: string
  filename: string
  path: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  category: string
  uploadedAt: Date
  uploadedById: string | null
  _count: {
    variantImages: number
    userProfiles: number
  }
}

export interface DeleteImageResult {
  success: boolean
  error?: string
}

/**
 * Удалить изображение по ID.
 * Удаляет запись в БД и файл на диске.
 */
export async function deleteImage(imageId: string): Promise<DeleteImageResult> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Unauthorized' }
  }

  const db = getEnhancedPrisma(session.user)

  try {
    // Получаем изображение
    const image = (await db.image.findUnique({
      where: { id: imageId },
      include: {
        _count: {
          select: {
            variantImages: true,
            userProfiles: true,
          },
        },
      },
    })) as unknown as ImageWithCount | null

    if (!image) {
      return { success: false, error: 'Изображение не найдено' }
    }

    // Проверяем использование в CustomOrder
    const customOrdersCount = await db.customOrder.count({
      where: { referenceImageIds: { has: imageId } },
    })

    // Если изображение используется - не удаляем
    if (image._count.variantImages > 0 || image._count.userProfiles > 0 || customOrdersCount > 0) {
      return {
        success: false,
        error: `Изображение используется: ${image._count.variantImages} товаров, ${image._count.userProfiles} профилей, ${customOrdersCount} заказов`,
      }
    }

    // Удаляем файл с диска
    const filePath = join(UPLOADS_DIR, image.path)
    try {
      await unlink(filePath)
    } catch (fileError) {
      // Файл может не существовать - это не критично
      console.warn(`Файл не найден при удалении: ${filePath}`, fileError)
    }

    // Удаляем запись из БД
    await db.image.delete({ where: { id: imageId } })

    return { success: true }
  } catch (error) {
    console.error('Ошибка удаления изображения:', error)
    return { success: false, error: 'Ошибка удаления изображения' }
  }
}

/**
 * Массовое удаление неиспользуемых изображений.
 */
export async function deleteUnusedImages(): Promise<{ success: boolean; deleted: number; error?: string }> {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, deleted: 0, error: 'Unauthorized' }
  }

  const db = getEnhancedPrisma(session.user)

  try {
    // Получаем все изображения с подсчётом использования
    const allImages = (await db.image.findMany({
      include: {
        _count: {
          select: {
            variantImages: true,
            userProfiles: true,
          },
        },
      },
    })) as unknown as ImageWithCount[]

    // Получаем ID изображений, используемых в CustomOrder
    const customOrderImages = await db.customOrder.findMany({
      where: { referenceImageIds: { isEmpty: false } },
      select: { referenceImageIds: true },
    })
    const usedInCustomOrders = new Set(
      customOrderImages.flatMap((order: (typeof customOrderImages)[number]) => order.referenceImageIds)
    )

    // Находим неиспользуемые
    const unusedImages = allImages.filter(
      (img) => img._count.variantImages === 0 && img._count.userProfiles === 0 && !usedInCustomOrders.has(img.id)
    )

    let deleted = 0

    for (const image of unusedImages) {
      // Удаляем файл
      const filePath = join(UPLOADS_DIR, image.path)
      try {
        await unlink(filePath)
      } catch {
        // Файл может не существовать
      }

      // Удаляем запись
      await db.image.delete({ where: { id: image.id } })
      deleted++
    }

    return { success: true, deleted }
  } catch (error) {
    console.error('Ошибка массового удаления:', error)
    return { success: false, deleted: 0, error: 'Ошибка массового удаления' }
  }
}
