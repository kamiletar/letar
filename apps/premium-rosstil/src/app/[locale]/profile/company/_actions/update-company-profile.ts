'use server'

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { type CompanyProfileData, CompanyProfileSchema } from '../_schemas/company-profile.schema'

export type UpdateCompanyProfileResult = { success: true } | { success: false; error: string }

export async function updateCompanyProfile(data: CompanyProfileData): Promise<UpdateCompanyProfileResult> {
  // 1. Аутентификация
  const session = await getSession()
  if (!session?.user) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  // 2. Валидация
  const parsed = CompanyProfileSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const validatedData = parsed.data

  // 3. Upsert CompanyProfile
  try {
    await prisma.companyProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        companyName: validatedData.companyName,
        companyINN: validatedData.companyINN || null,
        companyAddress: validatedData.companyAddress || null,
        contactPerson: validatedData.contactPerson || null,
        companyPhone: validatedData.companyPhone || null,
        companyEmail: validatedData.companyEmail || null,
      },
      update: {
        companyName: validatedData.companyName,
        companyINN: validatedData.companyINN || null,
        companyAddress: validatedData.companyAddress || null,
        contactPerson: validatedData.contactPerson || null,
        companyPhone: validatedData.companyPhone || null,
        companyEmail: validatedData.companyEmail || null,
      },
    })
  } catch (error) {
    console.error('Failed to update company profile:', error)
    return { success: false, error: 'Не удалось сохранить данные компании. Попробуйте ещё раз.' }
  }

  // 4. Инвалидируем кэш
  revalidatePath('/profile')
  revalidatePath('/profile/company')

  return { success: true }
}

export async function deleteCompanyProfile() {
  const session = await getSession()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  await prisma.companyProfile.delete({
    where: { userId: session.user.id },
  })

  revalidatePath('/profile')
  revalidatePath('/profile/company')

  return { success: true }
}
