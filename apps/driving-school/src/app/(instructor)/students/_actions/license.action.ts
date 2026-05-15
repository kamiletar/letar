'use server'

import { requireInstructor } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import type { LicenseCategory, TransmissionType } from '@letar/driving-school-db/prisma'
import { revalidatePath } from 'next/cache'

// === Типы ===

export interface StudentLicenseForInstructor {
  id: string
  category: LicenseCategory
  transmissionRestriction: TransmissionType | null
  obtainedAt: Date
  expiresAt: Date
  isVerified: boolean
  verifiedAt: Date | null
}

export type ActionResult = { success: true } | { success: false; error: string }

// === Actions для инструктора ===

/**
 * Получить права ученика (для инструктора)
 */
export async function getStudentLicensesForInstructor(
  studentUserId: string
): Promise<{ success: true; licenses: StudentLicenseForInstructor[] } | { success: false; error: string }> {
  try {
    const authResult = await requireInstructor()
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }
    const db = getEnhancedPrisma(authResult.user)

    // Получаем профиль ученика
    const studentProfile = await db.studentProfile.findFirst({
      where: { userId: studentUserId },
      include: {
        studentLicenses: {
          orderBy: { category: 'asc' },
        },
      },
    })

    if (!studentProfile) {
      return { success: false, error: 'Профиль ученика не найден' }
    }

    const licenses: StudentLicenseForInstructor[] = studentProfile.studentLicenses.map((l) => ({
      id: l.id,
      category: l.category,
      transmissionRestriction: l.transmissionRestriction,
      obtainedAt: l.obtainedAt,
      expiresAt: l.expiresAt,
      isVerified: l.isVerified,
      verifiedAt: l.verifiedAt,
    }))

    return { success: true, licenses }
  } catch (error) {
    console.error('Ошибка получения прав ученика:', error)
    return { success: false, error: 'Произошла ошибка' }
  }
}

/**
 * Подтвердить права ученика
 * Инструктор подтверждает, что проверил права ученика
 */
export async function verifyStudentLicense(licenseId: string): Promise<ActionResult> {
  try {
    const authResult = await requireInstructor()
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }
    const db = getEnhancedPrisma(authResult.user)

    // Проверяем, что права существуют
    const license = await db.studentLicense.findUnique({
      where: { id: licenseId },
    })

    if (!license) {
      return { success: false, error: 'Права не найдены' }
    }

    if (license.isVerified) {
      return { success: false, error: 'Права уже подтверждены' }
    }

    // Подтверждаем права
    await db.studentLicense.update({
      where: { id: licenseId },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedById: authResult.user.id,
      },
    })

    revalidatePath('/students')
    return { success: true }
  } catch (error) {
    console.error('Ошибка подтверждения прав:', error)
    return { success: false, error: 'Произошла ошибка' }
  }
}
