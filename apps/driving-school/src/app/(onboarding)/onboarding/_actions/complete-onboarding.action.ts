'use server'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { UserRole } from '@letar/driving-school-db/prisma'
import { redirect } from 'next/navigation'
import type { CompleteOnboardingData } from '../_schemas/onboarding.schema'

export type CompleteOnboardingResult =
  | { success: true }
  | { success: false; error: 'UNAUTHORIZED' | 'ALREADY_COMPLETED' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR' }

/**
 * Server action для завершения onboarding
 * Создаёт профили и обновляет данные пользователя
 */
export async function completeOnboarding(data: CompleteOnboardingData): Promise<CompleteOnboardingResult> {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return { success: false, error: 'UNAUTHORIZED' }
    }

    const userId = session.user.id

    // Проверяем, не завершён ли уже onboarding
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isOnboardingComplete: true },
    })

    if (user?.isOnboardingComplete) {
      return { success: false, error: 'ALREADY_COMPLETED' }
    }

    // Обрабатываем в зависимости от роли
    switch (data.role) {
      case 'STUDENT': {
        await prisma.$transaction(async (tx) => {
          // Обновляем пользователя (роль USER по умолчанию, STUDENT будет в SchoolMembership или InstructorStudentLink)
          await tx.user.update({
            where: { id: userId },
            data: {
              name: data.name,
              isOnboardingComplete: true,
            },
          })

          // Создаём профиль студента
          await tx.studentProfile.upsert({
            where: { userId },
            create: {
              userId,
              preferredAreas: data.preferredAreas || [],
            },
            update: {
              preferredAreas: data.preferredAreas || [],
            },
          })
        })
        break
      }

      case 'INSTRUCTOR': {
        await prisma.$transaction(async (tx) => {
          // Обновляем пользователя: добавляем роль FREELANCE_INSTRUCTOR
          await tx.user.update({
            where: { id: userId },
            data: {
              name: data.name,
              roles: [UserRole.USER, UserRole.FREELANCE_INSTRUCTOR],
              isOnboardingComplete: true,
            },
          })

          // Создаём профиль студента (у всех пользователей есть)
          await tx.studentProfile.upsert({
            where: { userId },
            create: { userId },
            update: {},
          })

          // Преобразуем строку даты в объект Date
          const experienceStartDate = data.experienceStartDate ? new Date(data.experienceStartDate) : undefined

          // Создаём профиль инструктора
          const instructorProfile = await tx.instructorProfile.upsert({
            where: { userId },
            create: {
              userId,
              experienceStartDate,
              isPublic: data.isPublic ?? true,
            },
            update: {
              experienceStartDate,
              isPublic: data.isPublic ?? true,
            },
          })

          // Создаём автомобиль как основной
          await tx.instructorVehicle.create({
            data: {
              instructorProfileId: instructorProfile.id,
              brand: data.carBrand,
              model: data.carModel,
              transmission: data.carTransmission,
              isPrimary: true,
              isActive: true,
              isAvailable: true,
            },
          })
        })
        break
      }

      case 'SCHOOL_ADMIN': {
        await prisma.$transaction(async (tx) => {
          // Обновляем пользователя (роль owner будет в Member)
          await tx.user.update({
            where: { id: userId },
            data: {
              name: data.name,
              isOnboardingComplete: true,
            },
          })

          // Генерируем slug из названия
          const baseSlug = data.schoolName
            .toLowerCase()
            .replace(/[^a-zа-яё0-9\s-]/gi, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()
            .slice(0, 50)

          // Проверяем уникальность slug
          let slug = baseSlug
          let counter = 1
          while (await tx.organization.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`
            counter++
          }

          // Сериализуем массивы в JSON для metadata
          const metadata = JSON.stringify({
            cities: [data.schoolCity],
            licenseCategories: data.schoolLicenseCategories || [],
          })

          // Создаём организацию (автошколу)
          const organization = await tx.organization.create({
            data: {
              name: data.schoolName,
              slug,
              phone: data.schoolPhone || null,
              email: data.schoolEmail || null,
              website: data.schoolWebsite || null,
              description: data.schoolDescription || null,
              isPublic: data.schoolIsPublic ?? false,
              metadata,
              reviewCount: 0,
            },
          })

          // Создаём привязку пользователя к организации с ролью owner
          await tx.member.create({
            data: {
              userId,
              organizationId: organization.id,
              role: 'owner',
            },
          })
        })
        break
      }
    }

    return { success: true }
  } catch (error) {
    console.error('[ONBOARDING] Complete onboarding error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Завершает onboarding и редиректит на dashboard
 */
export async function completeOnboardingAndRedirect(data: CompleteOnboardingData): Promise<void> {
  const result = await completeOnboarding(data)

  if (result.success) {
    redirect('/dashboard')
  }

  // Если ошибка - перезагружаем страницу onboarding
  redirect('/onboarding?error=' + (result.success ? '' : result.error))
}
