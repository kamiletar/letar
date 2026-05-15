'use server'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

/**
 * Server action для обновления аватара пользователя.
 * Обновляет связь avatarId в модели UserProfile с моделью Image.
 *
 * @param imageId - ID изображения в таблице Image, или null для удаления аватара
 */
export async function updateAvatar(imageId: string | null) {
  // Проверка аутентификации
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  try {
    // Upsert UserProfile с новым аватаром
    await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        avatarId: imageId,
      },
      update: {
        avatarId: imageId,
      },
    })

    // Инвалидируем кэш
    revalidatePath('/profile')
    revalidatePath('/profile/edit')

    return { success: true }
  } catch (error) {
    console.error('Failed to update avatar:', error)
    throw new Error('Не удалось обновить аватар', { cause: error })
  }
}
