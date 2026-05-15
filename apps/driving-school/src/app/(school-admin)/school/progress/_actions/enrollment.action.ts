'use server'

import type { LicenseCategory, TransmissionType } from '@letar/driving-school-db/prisma'
import type { Decimal } from 'decimal.js'

import { requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import { type ActionErrorCode } from '@/lib/errors'

// === Типы для записи на курс ===

export interface CourseEnrollmentSummary {
  id: string
  courseId: string
  courseName: string
  category: LicenseCategory
  transmissionType: TransmissionType | null
  practiceLessons: number // Из курса
  lessonsUsed: number
  totalPrice: number
  paidAmount: number
  isFullyPaid: boolean
  enrolledAt: Date
}

export interface OptionalPurchaseSummary {
  id: string
  lessonTypeId: string
  lessonTypeName: string
  quantity: number
  used: number
  remaining: number
  paidAmount: number
  purchasedAt: Date
}

// === Результаты операций ===

export type EnrollStudentResult =
  | { success: true; enrollmentIds: string[] }
  | { success: false; error: ActionErrorCode; message?: string }

export type GetEnrollmentsResult =
  | { success: true; enrollments: CourseEnrollmentSummary[] }
  | { success: false; error: ActionErrorCode }

export type GetOptionalPurchasesResult =
  | { success: true; purchases: OptionalPurchaseSummary[] }
  | { success: false; error: ActionErrorCode }

export type PurchaseResult =
  | { success: true; purchaseId: string }
  | { success: false; error: ActionErrorCode; message?: string }

export type GetAvailableLessonsResult =
  | {
      success: true
      available: {
        categoryProgressId: string
        category: LicenseCategory
        remainingLessons: number
        optionalLessons: { typeId: string; typeName: string; remaining: number }[]
      }
    }
  | { success: false; error: ActionErrorCode }

// === Запись ученика на курсы ===

export interface EnrollStudentData {
  progressId: string
  courses: {
    courseId: string
    initialPayment?: number
    paymentMethod?: string
  }[]
}

export async function enrollStudentToCoursesAction(data: EnrollStudentData): Promise<EnrollStudentResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)
    const progress = await db.studentProgress.findUnique({
      where: { id: data.progressId },
      select: { id: true, organizationId: true, userId: true },
    })

    if (!progress) {
      return { success: false, error: 'NOT_FOUND' }
    }

    const schoolAuthResult = await requireSchoolManager(progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    if (data.courses.length === 0) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Выберите хотя бы один курс' }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
    // Получаем информацию о курсах
    const courseIds = data.courses.map((c) => c.courseId)
    const courses = await schoolDb.trainingCourse.findMany({
      where: { id: { in: courseIds }, organizationId: progress.organizationId },
    })

    // Проверяем, что все курсы активны
    const inactiveCourses = courses.filter((c) => !c.isActive)
    if (inactiveCourses.length > 0) {
      return {
        success: false,
        error: 'COURSE_NOT_ACTIVE',
        message: `Курс "${inactiveCourses[0].name}" неактивен`,
      }
    }

    const enrollmentIds: string[] = []

    await schoolDb.$transaction(async (tx) => {
      for (const courseData of data.courses) {
        const course = courses.find((c) => c.id === courseData.courseId)
        if (!course) {
          throw new Error(`Курс ${courseData.courseId} не найден`)
        }

        // Создаём или получаем CategoryProgress для категории курса
        let categoryProgress = await tx.categoryProgress.findUnique({
          where: {
            progressId_category: {
              progressId: data.progressId,
              category: course.category,
            },
          },
        })

        if (!categoryProgress) {
          categoryProgress = await tx.categoryProgress.create({
            data: {
              progressId: data.progressId,
              category: course.category,
              transmissionRestriction: course.transmissionType,
              practiceStatus: 'NOT_STARTED',
              instructorApprovalStatus: 'NOT_REQUESTED',
            },
          })
        }

        // Создаём CourseEnrollment
        // Cast для совместимости типов Decimal между ZenStack и Prisma
        const enrollment = await tx.courseEnrollment.create({
          data: {
            progressId: data.progressId,
            categoryProgressId: categoryProgress.id,
            courseId: course.id,
            totalPrice: course.price,
            paidAmount: (courseData.initialPayment ?? 0) as unknown as Decimal,
          },
        })

        enrollmentIds.push(enrollment.id)

        // Если есть начальный платёж, создаём запись
        if (courseData.initialPayment && courseData.initialPayment > 0) {
          await tx.coursePayment.create({
            data: {
              enrollmentId: enrollment.id,
              // Cast для совместимости типов Decimal между ZenStack и Prisma
              amount: courseData.initialPayment as unknown as Decimal,
              method: courseData.paymentMethod ?? 'CASH',
              recordedById: authResult.user.id,
              note: 'Первоначальный взнос при записи',
            },
          })
        }
      }
    })

    return { success: true, enrollmentIds }
  } catch (error) {
    console.error('Ошибка записи на курсы:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение записей ученика ===

export async function getStudentEnrollmentsAction(progressId: string): Promise<GetEnrollmentsResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)
    const progress = await db.studentProgress.findUnique({
      where: { id: progressId },
      select: { id: true, organizationId: true },
    })

    if (!progress) {
      return { success: false, error: 'NOT_FOUND' }
    }

    const schoolAuthResult = await requireSchoolManager(progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
    const enrollments = await schoolDb.courseEnrollment.findMany({
      where: { progressId },
      include: {
        course: {
          select: { id: true, name: true, category: true, transmissionType: true, practiceLessons: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const summaries: CourseEnrollmentSummary[] = enrollments.map((e) => ({
      id: e.id,
      courseId: e.course.id,
      courseName: e.course.name,
      category: e.course.category,
      transmissionType: e.course.transmissionType,
      practiceLessons: e.course.practiceLessons,
      lessonsUsed: e.lessonsUsed,
      totalPrice: Number(e.totalPrice),
      paidAmount: Number(e.paidAmount),
      isFullyPaid: Number(e.paidAmount) >= Number(e.totalPrice),
      enrolledAt: e.createdAt,
    }))

    return { success: true, enrollments: summaries }
  } catch (error) {
    console.error('Ошибка получения записей:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Покупка дополнительных занятий ===

export interface PurchaseAdditionalLessonsData {
  enrollmentId: string
  lessonsCount: number
  pricePerLesson: number
  paymentMethod?: string
  note?: string
}

export async function purchaseAdditionalLessonsAction(data: PurchaseAdditionalLessonsData): Promise<PurchaseResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)
    const enrollment = await db.courseEnrollment.findUnique({
      where: { id: data.enrollmentId },
      include: {
        progress: {
          select: { organizationId: true },
        },
      },
    })

    if (!enrollment) {
      return { success: false, error: 'NOT_FOUND' }
    }

    const schoolAuthResult = await requireSchoolManager(enrollment.progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    if (data.lessonsCount < 1) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Количество занятий должно быть больше 0' }
    }

    const totalAmount = data.lessonsCount * data.pricePerLesson

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
    await schoolDb.$transaction(async (tx) => {
      // Увеличиваем стоимость и оплату
      await tx.courseEnrollment.update({
        where: { id: data.enrollmentId },
        data: {
          totalPrice: { increment: totalAmount },
          paidAmount: { increment: totalAmount },
        },
      })

      // Создаём платёж
      await tx.coursePayment.create({
        data: {
          enrollmentId: data.enrollmentId,
          // Cast для совместимости типов Decimal между ZenStack и Prisma
          amount: totalAmount as unknown as Decimal,
          method: data.paymentMethod ?? 'CASH',
          recordedById: authResult.user.id,
          note: data.note ?? `Дополнительные занятия: ${data.lessonsCount} шт.`,
        },
      })
    })

    return { success: true, purchaseId: data.enrollmentId }
  } catch (error) {
    console.error('Ошибка покупки доп. занятий:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Покупка опциональных занятий ===

export interface PurchaseOptionalLessonsData {
  progressId: string
  lessonTypeId: string
  quantity: number
  paymentMethod?: string
  note?: string
}

export async function purchaseOptionalLessonsAction(data: PurchaseOptionalLessonsData): Promise<PurchaseResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)
    const progress = await db.studentProgress.findUnique({
      where: { id: data.progressId },
      select: { id: true, organizationId: true },
    })

    if (!progress) {
      return { success: false, error: 'NOT_FOUND' }
    }

    const schoolAuthResult = await requireSchoolManager(progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
    const lessonType = await schoolDb.optionalLessonType.findUnique({
      where: { id: data.lessonTypeId },
    })

    if (!lessonType) {
      return { success: false, error: 'NOT_FOUND', message: 'Тип занятия не найден' }
    }

    if (!lessonType.isActive) {
      return { success: false, error: 'LESSON_TYPE_NOT_ACTIVE', message: 'Тип занятия неактивен' }
    }

    if (data.quantity < 1) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Количество должно быть больше 0' }
    }

    const totalPrice = Number(lessonType.price) * data.quantity

    const purchase = await schoolDb.optionalLessonPurchase.create({
      data: {
        progressId: data.progressId,
        lessonTypeId: data.lessonTypeId,
        quantity: data.quantity,
        // Cast для совместимости типов Decimal между ZenStack и Prisma
        paidAmount: totalPrice as unknown as Decimal,
        used: 0,
      },
    })

    return { success: true, purchaseId: purchase.id }
  } catch (error) {
    console.error('Ошибка покупки опциональных занятий:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение опциональных покупок ===

export async function getOptionalPurchasesAction(progressId: string): Promise<GetOptionalPurchasesResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)
    const progress = await db.studentProgress.findUnique({
      where: { id: progressId },
      select: { id: true, organizationId: true },
    })

    if (!progress) {
      return { success: false, error: 'NOT_FOUND' }
    }

    const schoolAuthResult = await requireSchoolManager(progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
    const purchases = await schoolDb.optionalLessonPurchase.findMany({
      where: { progressId },
      include: {
        lessonType: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const summaries: OptionalPurchaseSummary[] = purchases.map((p) => ({
      id: p.id,
      lessonTypeId: p.lessonType.id,
      lessonTypeName: p.lessonType.name,
      quantity: p.quantity,
      used: p.used,
      remaining: p.quantity - p.used,
      paidAmount: Number(p.paidAmount),
      purchasedAt: p.createdAt,
    }))

    return { success: true, purchases: summaries }
  } catch (error) {
    console.error('Ошибка получения опциональных покупок:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение доступных занятий для категории ===

export async function getAvailableLessonsAction(categoryProgressId: string): Promise<GetAvailableLessonsResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)
    const categoryProgress = await db.categoryProgress.findUnique({
      where: { id: categoryProgressId },
      include: {
        progress: {
          select: { id: true, organizationId: true },
        },
        courseEnrollments: {
          include: {
            course: {
              select: { practiceLessons: true },
            },
          },
        },
      },
    })

    if (!categoryProgress) {
      return { success: false, error: 'NOT_FOUND' }
    }

    const schoolAuthResult = await requireSchoolManager(categoryProgress.progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    // Считаем оставшиеся занятия по курсам
    const totalLessons = categoryProgress.courseEnrollments.reduce(
      (sum: number, e) => sum + e.course.practiceLessons,
      0
    )
    const usedLessons = categoryProgress.courseEnrollments.reduce((sum: number, e) => sum + e.lessonsUsed, 0)
    const remainingLessons = totalLessons - usedLessons

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
    // Получаем опциональные занятия
    const optionalPurchases = await schoolDb.optionalLessonPurchase.findMany({
      where: {
        progressId: categoryProgress.progress.id,
        lessonType: {
          OR: [{ category: categoryProgress.category }, { category: null }],
        },
      },
      include: {
        lessonType: {
          select: { id: true, name: true },
        },
      },
    })

    const optionalLessons = optionalPurchases
      .filter((p) => p.quantity > p.used)
      .map((p) => ({
        typeId: p.lessonType.id,
        typeName: p.lessonType.name,
        remaining: p.quantity - p.used,
      }))

    return {
      success: true,
      available: {
        categoryProgressId,
        category: categoryProgress.category,
        remainingLessons,
        optionalLessons,
      },
    }
  } catch (error) {
    console.error('Ошибка получения доступных занятий:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
