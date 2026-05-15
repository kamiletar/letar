'use server'

import { revalidatePath } from 'next/cache'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { type UpdateStudentProfileData, UpdateStudentProfileSchema } from '../_schemas/student-profile.schema'

/**
 * Тип результата action
 */
export type UpdateStudentProfileResult = { success: true } | { success: false; error: string }

/**
 * Server action для обновления профиля ученика
 */
export async function updateStudentProfileAction(data: UpdateStudentProfileData): Promise<UpdateStudentProfileResult> {
  const parsed = UpdateStudentProfileSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const session = await getSession()
  if (!session?.user?.id) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  const db = getEnhancedPrisma(session.user)

  try {
    const validData = parsed.data

    // Проверяем что пользователь - ученик
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { studentProfile: true },
    })

    if (!user || !user.studentProfile) {
      return { success: false, error: 'Профиль ученика не найден' }
    }

    // Обновляем данные пользователя
    await db.user.update({
      where: { id: session.user.id },
      data: {
        name: validData.name,
        phone: validData.phone,
      },
    })

    // Обновляем профиль ученика
    await db.studentProfile.update({
      where: { userId: session.user.id },
      data: {
        preferredAreas: validData.preferredAreas,
        noteForInstructor: validData.noteForInstructor,
      },
    })

    // Ревалидируем путь
    revalidatePath('/my-profile')

    return { success: true }
  } catch (error) {
    console.error('Update student profile error:', error)
    return { success: false, error: 'Произошла ошибка при сохранении профиля' }
  }
}

/**
 * Server action для получения профиля ученика
 */
export async function getStudentProfile() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return null
    }

    const db = getEnhancedPrisma(session.user)

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { studentProfile: true },
    })

    // Проверяем наличие профиля ученика
    if (!user || !user.studentProfile) {
      return null
    }

    return {
      name: user.name,
      phone: user.phone,
      preferredAreas: user.studentProfile.preferredAreas as string[] | null,
      noteForInstructor: user.studentProfile.noteForInstructor,
    }
  } catch (error) {
    console.error('Get student profile error:', error)
    return null
  }
}
