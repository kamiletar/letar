'use server'

import { getSession, isAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { existsSync } from 'fs'
import { unlink } from 'fs/promises'
import { join } from 'path'

export interface DeleteImageResult {
  success: boolean
  error?: string
}

/**
 * Удалить изображение по ID.
 * Удаляет запись в БД и файл на диске.
 */
export async function deleteImage(imageId: string): Promise<DeleteImageResult> {
  const admin = await isAdmin()
  if (!admin) {
    return { success: false, error: 'Доступ запрещён' }
  }

  const session = await getSession()
  const db = getEnhancedPrisma(session?.user)

  try {
    // Получаем изображение
    const image = await db.image.findUnique({
      where: { id: imageId },
    })

    if (!image) {
      return { success: false, error: 'Изображение не найдено' }
    }

    // Удаляем файл с диска
    const filePath = join(process.cwd(), 'uploads', image.path)
    if (existsSync(filePath)) {
      try {
        await unlink(filePath)
      } catch (fileError) {
        // Файл может не существовать — это не критично
        console.warn(`[deleteImage] Файл не найден: ${filePath}`, fileError)
      }
    }

    // Удаляем запись из БД
    await db.image.delete({ where: { id: imageId } })

    return { success: true }
  } catch (error) {
    console.error('[deleteImage] Ошибка:', error)
    return { success: false, error: 'Ошибка удаления изображения' }
  }
}
