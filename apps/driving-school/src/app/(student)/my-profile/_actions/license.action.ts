'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type { LicenseCategory, TransmissionType } from '@letar/driving-school-db/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

// === Типы ===

export type ActionResult = { success: true } | { success: false; error: string }

export interface StudentLicenseData {
  id: string
  category: LicenseCategory
  transmissionRestriction: TransmissionType | null
  obtainedAt: Date
  expiresAt: Date
  isVerified: boolean
  verifiedAt: Date | null
}

// === Схемы валидации ===

const LicenseFormSchema = z.object({
  category: z.enum(['M', 'A1', 'A', 'B1', 'B', 'C1', 'C', 'D1', 'D', 'BE', 'CE', 'C1E', 'DE', 'D1E', 'Tm', 'Tb']),
  transmissionRestriction: z.enum(['MANUAL', 'AUTOMATIC']).optional(),
  obtainedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
})

const RenewLicenseSchema = z.object({
  obtainedAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
})

// === Actions для ученика ===

/**
 * Получить все права ученика
 */
export async function getStudentLicenses(): Promise<StudentLicenseData[]> {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return []
    }

    const db = getEnhancedPrisma(session.user)

    const studentProfile = await db.studentProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        studentLicenses: {
          orderBy: { category: 'asc' },
        },
      },
    })

    if (!studentProfile) {
      return []
    }

    return studentProfile.studentLicenses.map((license) => ({
      id: license.id,
      category: license.category,
      transmissionRestriction: license.transmissionRestriction,
      obtainedAt: license.obtainedAt,
      expiresAt: license.expiresAt,
      isVerified: license.isVerified,
      verifiedAt: license.verifiedAt,
    }))
  } catch (error) {
    console.error('Ошибка получения прав:', error)
    return []
  }
}

/**
 * Добавить водительские права
 */
export async function addStudentLicense(formData: {
  category: LicenseCategory
  transmissionRestriction?: TransmissionType
  obtainedAt: Date
  expiresAt: Date
}): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Необходимо войти в систему' }
    }

    const db = getEnhancedPrisma(session.user)

    // Валидация
    const parseResult = LicenseFormSchema.safeParse(formData)
    if (!parseResult.success) {
      return { success: false, error: 'Неверные данные' }
    }

    const { category, transmissionRestriction, obtainedAt, expiresAt } = parseResult.data

    // Проверка дат
    if (expiresAt <= obtainedAt) {
      return { success: false, error: 'Дата истечения должна быть позже даты получения' }
    }

    // Получаем профиль ученика
    const studentProfile = await db.studentProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!studentProfile) {
      return { success: false, error: 'Профиль ученика не найден' }
    }

    // Проверяем, нет ли уже прав этой категории
    const existing = await db.studentLicense.findUnique({
      where: {
        studentProfileId_category: {
          studentProfileId: studentProfile.id,
          category,
        },
      },
    })

    if (existing) {
      return { success: false, error: 'Права этой категории уже добавлены' }
    }

    // Создаём запись
    await db.studentLicense.create({
      data: {
        studentProfileId: studentProfile.id,
        category,
        transmissionRestriction: transmissionRestriction || null,
        obtainedAt,
        expiresAt,
        isVerified: false,
      },
    })

    revalidatePath('/my-profile')
    return { success: true }
  } catch (error) {
    console.error('Ошибка добавления прав:', error)
    return { success: false, error: 'Произошла ошибка' }
  }
}

/**
 * Обновить (продлить) водительские права
 * При обновлении статус верификации сбрасывается
 */
export async function renewStudentLicense(
  licenseId: string,
  data: { obtainedAt: Date; expiresAt: Date }
): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Необходимо войти в систему' }
    }

    const db = getEnhancedPrisma(session.user)

    // Валидация
    const parseResult = RenewLicenseSchema.safeParse(data)
    if (!parseResult.success) {
      return { success: false, error: 'Неверные данные' }
    }

    const { obtainedAt, expiresAt } = parseResult.data

    // Проверка дат
    if (expiresAt <= obtainedAt) {
      return { success: false, error: 'Дата истечения должна быть позже даты получения' }
    }

    // Получаем профиль ученика
    const studentProfile = await db.studentProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!studentProfile) {
      return { success: false, error: 'Профиль ученика не найден' }
    }

    // Проверяем, что права принадлежат этому ученику
    const license = await db.studentLicense.findUnique({
      where: { id: licenseId },
    })

    if (!license || license.studentProfileId !== studentProfile.id) {
      return { success: false, error: 'Права не найдены' }
    }

    // Обновляем
    await db.studentLicense.update({
      where: { id: licenseId },
      data: {
        obtainedAt,
        expiresAt,
        isVerified: false, // Сбрасываем верификацию
        verifiedAt: null,
        verifiedById: null,
      },
    })

    revalidatePath('/my-profile')
    return { success: true }
  } catch (error) {
    console.error('Ошибка обновления прав:', error)
    return { success: false, error: 'Произошла ошибка' }
  }
}

/**
 * Удалить водительские права
 */
export async function removeStudentLicense(licenseId: string): Promise<ActionResult> {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return { success: false, error: 'Необходимо войти в систему' }
    }

    const db = getEnhancedPrisma(session.user)

    // Получаем профиль ученика
    const studentProfile = await db.studentProfile.findUnique({
      where: { userId: session.user.id },
    })

    if (!studentProfile) {
      return { success: false, error: 'Профиль ученика не найден' }
    }

    // Проверяем, что права принадлежат этому ученику
    const license = await db.studentLicense.findUnique({
      where: { id: licenseId },
    })

    if (!license || license.studentProfileId !== studentProfile.id) {
      return { success: false, error: 'Права не найдены' }
    }

    // Удаляем
    await db.studentLicense.delete({
      where: { id: licenseId },
    })

    revalidatePath('/my-profile')
    return { success: true }
  } catch (error) {
    console.error('Ошибка удаления прав:', error)
    return { success: false, error: 'Произошла ошибка' }
  }
}
