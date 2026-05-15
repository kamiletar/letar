'use server'

import { revalidatePath } from 'next/cache'

import { withInstructor } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import { getFileUrl } from '@/lib/images'
import {
  type UpdateInstructorProfileInput,
  UpdateInstructorProfileSchema,
  type WorkingArea,
} from '../_schemas/instructor-profile.schema'

/**
 * Тип результата server action
 */
export type UpdateInstructorProfileResult = {
  success?: boolean
  error?: string
}

/**
 * Server action для обновления профиля инструктора
 * Принимает INPUT тип (до трансформации схемой)
 */
export async function updateInstructorProfileAction(
  data: UpdateInstructorProfileInput
): Promise<UpdateInstructorProfileResult> {
  // Валидация через Zod
  const parsed = UpdateInstructorProfileSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Некорректные данные' }
  }

  return withInstructor(async (user) => {
    const db = getEnhancedPrisma(user)

    try {
      const validData = parsed.data

      // Обновляем данные пользователя
      await db.user.update({
        where: { id: user.id },
        data: {
          name: validData.name,
          phone: validData.phone,
        },
      })

      // Обновляем профиль инструктора
      // ВАЖНО: Prisma игнорирует undefined (не обновляет поле),
      // поэтому для очистки поля нужно явно передать null или пустую строку
      await db.instructorProfile.update({
        where: { userId: user.id },
        data: {
          bio: validData.bio ?? null, // undefined -> null для очистки поля
          experienceStartDate: validData.experienceStartDate,
          licenseCategories: validData.licenseCategories,
          workingAreas: validData.workingAreas ?? undefined,
          isPublic: validData.isPublic ?? false,
        },
      })

      // Обновляем кэш страниц для ProfileCta и других серверных компонентов
      // Форма защищена от сброса через key={session.user.id} в page.tsx
      revalidatePath('/instructor-profile')
      revalidatePath('/dashboard')

      return { success: true }
    } catch (error) {
      console.error('Update instructor profile error:', error)
      return { error: 'Произошла ошибка при сохранении профиля' }
    }
  })
}

/**
 * Server action для получения профиля инструктора
 */
export async function getInstructorProfile() {
  const result = await withInstructor(async (authUser) => {
    const db = getEnhancedPrisma(authUser)

    try {
      const user = await db.user.findUnique({
        where: { id: authUser.id },
        include: {
          instructorProfile: {
            include: {
              photo: true,
              vehicles: {
                where: { isActive: true },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                include: {
                  files: {
                    include: { file: true },
                    orderBy: { order: 'asc' },
                  },
                },
              },
            },
          },
        },
      })

      if (!user || !user.instructorProfile) {
        return null
      }

      // Получаем URL фото если есть
      const photoUrl = user.instructorProfile.photo ? getFileUrl(user.instructorProfile.photo.path) : null

      // Преобразуем vehicles для фронтенда
      const vehicles = user.instructorProfile.vehicles.map((v) => ({
        id: v.id,
        brand: v.brand,
        model: v.model,
        year: v.year,
        color: v.color,
        plateNumber: v.plateNumber,
        transmission: v.transmission as 'MANUAL' | 'AUTOMATIC',
        isPrimary: v.isPrimary,
        isActive: v.isActive,
        photoUrl: v.files[0]?.file ? getFileUrl(v.files[0].file.path) : null,
        files: v.files.map((vf) => ({
          id: vf.id,
          order: vf.order,
          alt: vf.alt,
          file: {
            id: vf.file.id,
            path: vf.file.path,
            filename: vf.file.filename,
            mimeType: vf.file.mimeType,
          },
        })),
      }))

      return {
        name: user.name,
        phone: user.phone,
        bio: user.instructorProfile.bio,
        experienceStartDate: user.instructorProfile.experienceStartDate,
        licenseCategories: user.instructorProfile.licenseCategories as string[] | null,
        workingAreas: user.instructorProfile.workingAreas as WorkingArea[] | null,
        isPublic: user.instructorProfile.isPublic,
        photoUrl,
        vehicles,
      }
    } catch (error) {
      console.error('Get instructor profile error:', error)
      return null
    }
  })

  // При ошибке авторизации возвращаем null
  if (!result || 'success' in result) {
    return null
  }
  return result
}
