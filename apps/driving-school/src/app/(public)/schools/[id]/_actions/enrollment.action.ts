'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { redirect } from 'next/navigation'

/**
 * Создаёт заявку на обучение в школе
 * Если пользователь не авторизован — перенаправляет на страницу входа
 */
export async function createEnrollmentAction(schoolId: string) {
  const session = await getSession()

  // Если не авторизован — перенаправляем на страницу входа
  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=/schools/${schoolId}`)
  }

  const userId = session.user.id
  const db = getEnhancedPrisma(session.user)

  // Проверяем, существует ли школа (Organization)
  const school = await db.organization.findUnique({
    where: { id: schoolId, isPublic: true },
    select: { id: true, name: true },
  })

  if (!school) {
    return { error: 'Школа не найдена' }
  }

  // Проверяем, не является ли пользователь уже членом школы
  const existingMembership = await db.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: schoolId,
        userId,
      },
    },
  })

  if (existingMembership) {
    return { error: 'Вы уже являетесь членом этой школы' }
  }

  // Проверяем, есть ли уже активная заявка
  const existingEnrollment = await db.schoolEnrollment.findFirst({
    where: {
      organizationId: schoolId,
      userId,
      status: 'PENDING',
    },
  })

  if (existingEnrollment) {
    return { error: 'У вас уже есть активная заявка в эту школу' }
  }

  // Создаём заявку
  await db.schoolEnrollment.create({
    data: {
      organizationId: schoolId,
      userId,
      status: 'PENDING',
    },
  })

  return { success: true, schoolName: school.name }
}
