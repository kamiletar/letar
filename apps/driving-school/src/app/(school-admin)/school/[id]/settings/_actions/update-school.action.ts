'use server'

import { requireSchoolAdmin } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import type { LicenseCategory, Organization } from '@letar/driving-school-db/models'
import { revalidatePath } from 'next/cache'

import { type UpdateSchoolInput, UpdateSchoolSchema } from '../_schemas/update-school.schema'

export type UpdateSchoolResult = { success: true } | { success: false; error: string }

export async function updateSchoolAction(data: UpdateSchoolInput): Promise<UpdateSchoolResult> {
  const parsed = UpdateSchoolSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const { schoolId, name, description, phone, email, website, licenseCategories, isPublic } = parsed.data

  const authResult = await requireSchoolAdmin(schoolId)
  if (!authResult.success) {
    const errorMessages: Record<string, string> = {
      UNAUTHORIZED: 'Необходимо авторизоваться',
      NOT_SCHOOL_ADMIN: 'У вас нет прав на редактирование этой школы',
    }
    return { success: false, error: errorMessages[authResult.error] ?? 'Ошибка авторизации' }
  }

  try {
    const db = getEnhancedPrisma(authResult.user)

    // Сохраняем массивные данные в metadata
    const metadata = JSON.stringify({
      licenseCategories: (licenseCategories || []) as LicenseCategory[],
    })

    // Обновляем школу (Organization)
    await db.organization.update({
      where: { id: schoolId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        website: website?.trim() || null,
        metadata,
        isPublic: isPublic ?? false,
      },
    })

    revalidatePath(`/school/${schoolId}`)
    revalidatePath(`/school/${schoolId}/settings`)
    revalidatePath('/school/settings')
    revalidatePath('/schools')

    return { success: true }
  } catch (error) {
    console.error('Update school error:', error)
    return { success: false, error: 'Не удалось обновить школу. Попробуйте позже.' }
  }
}

export async function getSchoolForSettings(
  schoolId: string
): Promise<{ success: true; school: Organization } | { success: false; error: string }> {
  const authResult = await requireSchoolAdmin(schoolId)
  if (!authResult.success) {
    const errorMapping: Record<string, string> = {
      UNAUTHORIZED: 'NOT_AUTHENTICATED',
      NOT_SCHOOL_ADMIN: 'NOT_ADMIN',
    }
    return { success: false, error: errorMapping[authResult.error] ?? authResult.error }
  }

  const db = getEnhancedPrisma(authResult.user)
  const school = await db.organization.findUnique({
    where: { id: schoolId },
  })

  if (!school) {
    return { success: false, error: 'NOT_FOUND' }
  }

  return { success: true, school }
}
