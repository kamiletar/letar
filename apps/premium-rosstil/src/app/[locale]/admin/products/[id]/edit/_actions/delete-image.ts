'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { deleteImageRecord, getImageById } from '@/lib/images/create-image'
import { existsSync } from 'fs'
import { unlink } from 'fs/promises'
import { revalidatePath } from 'next/cache'
import { join } from 'path'

export async function deleteVariantImage(productId: string, variantImageId: string) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  const db = getEnhancedPrisma(session.user)

  try {
    // Получаем информацию об изображении перед удалением
    const variantImage = await db.variantImage.findUnique({
      where: { id: variantImageId },
      select: { imageId: true },
    })

    if (!variantImage) {
      throw new Error('Image not found')
    }

    // Удаляем запись VariantImage из БД (каскадно удалит связь)
    await db.variantImage.delete({
      where: { id: variantImageId },
    })

    // Удаляем связанную запись Image и физический файл
    try {
      const image = await getImageById(variantImage.imageId)
      if (image) {
        // Удаляем физический файл
        const filepath = join(process.cwd(), 'uploads', image.path)
        if (existsSync(filepath)) {
          await unlink(filepath)
        }
        // Удаляем запись Image
        await deleteImageRecord(variantImage.imageId)
      }
    } catch (err) {
      console.warn('Failed to delete Image record:', err)
    }
  } catch (error) {
    console.error('Failed to delete variant image:', error)
    throw new Error('Не удалось удалить изображение', { cause: error })
  }

  revalidatePath(`/admin/products/${productId}/edit`)
}
