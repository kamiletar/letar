'use server'

import type { LicenseCategory, TheoryFormat, TransmissionType } from '@letar/driving-school-db/prisma'
import type { Decimal } from 'decimal.js'

import { requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import { type ActionErrorCode } from '@/lib/errors'

// === Типы для курсов обучения ===

export interface TrainingCourseSummary {
  id: string
  name: string
  category: LicenseCategory
  transmissionType: TransmissionType | null
  practiceLessons: number
  lessonDuration: number
  theoryFormat: TheoryFormat
  theoryHours: number | null
  price: number
  description: string | null
  isActive: boolean
  enrollmentsCount: number
}

// === Результаты операций ===

export type GetCoursesResult =
  | { success: true; courses: TrainingCourseSummary[] }
  | { success: false; error: ActionErrorCode }

export type GetCourseResult =
  | { success: true; course: TrainingCourseSummary }
  | { success: false; error: ActionErrorCode }

export type CreateCourseResult =
  | { success: true; courseId: string }
  | { success: false; error: ActionErrorCode; message?: string }

export type UpdateCourseResult = { success: true } | { success: false; error: ActionErrorCode; message?: string }

export type DeleteCourseResult = { success: true } | { success: false; error: ActionErrorCode; message?: string }

// === Получение списка курсов школы ===

export async function getCoursesAction(organizationId: string): Promise<GetCoursesResult> {
  try {
    const authResult = await requireSchoolManager(organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)
    const courses = await db.trainingCourse.findMany({
      where: { organizationId },
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
      orderBy: [{ isActive: 'desc' }, { category: 'asc' }, { name: 'asc' }],
    })

    // Cast для совместимости типов с _count между ZenStack и Prisma
    type CourseWithCount = (typeof courses)[number] & { _count: { enrollments: number } }
    const courseSummaries: TrainingCourseSummary[] = (courses as CourseWithCount[]).map((course: CourseWithCount) => ({
      id: course.id,
      name: course.name,
      category: course.category,
      transmissionType: course.transmissionType,
      practiceLessons: course.practiceLessons,
      lessonDuration: course.lessonDuration,
      theoryFormat: course.theoryFormat,
      theoryHours: course.theoryHours,
      price: Number(course.price),
      description: course.description,
      isActive: course.isActive,
      enrollmentsCount: course._count.enrollments,
    }))

    return { success: true, courses: courseSummaries }
  } catch (error) {
    console.error('Ошибка получения списка курсов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение курса по ID ===

export async function getCourseAction(courseId: string): Promise<GetCourseResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const course = await db.trainingCourse.findUnique({
        where: { id: courseId },
        include: {
          _count: {
            select: { enrollments: true },
          },
        },
      })

      if (!course) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(course.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      // Cast _count для совместимости типов между ZenStack и Prisma
      const courseWithCount = course as typeof course & { _count: { enrollments: number } }
      return {
        success: true,
        course: {
          id: courseWithCount.id,
          name: courseWithCount.name,
          category: courseWithCount.category,
          transmissionType: courseWithCount.transmissionType,
          practiceLessons: courseWithCount.practiceLessons,
          lessonDuration: courseWithCount.lessonDuration,
          theoryFormat: courseWithCount.theoryFormat,
          theoryHours: courseWithCount.theoryHours,
          price: Number(courseWithCount.price),
          description: courseWithCount.description,
          isActive: courseWithCount.isActive,
          enrollmentsCount: courseWithCount._count.enrollments,
        },
      }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка получения курса:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Создание курса ===

export interface CreateCourseData {
  organizationId: string
  name: string
  category: LicenseCategory
  transmissionType?: TransmissionType | null
  practiceLessons: number
  lessonDuration?: number
  theoryFormat: TheoryFormat
  theoryHours?: number | null
  price: number
  description?: string | null
}

export async function createCourseAction(data: CreateCourseData): Promise<CreateCourseResult> {
  try {
    const authResult = await requireSchoolManager(data.organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    // Валидация
    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Название курса обязательно' }
    }

    if (data.practiceLessons < 1) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Количество занятий должно быть больше 0' }
    }

    if (data.price < 0) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Цена не может быть отрицательной' }
    }

    const db = getEnhancedPrisma(authResult.user)
    const course = await db.trainingCourse.create({
      data: {
        organizationId: data.organizationId,
        name: data.name.trim(),
        category: data.category,
        transmissionType: data.transmissionType ?? null,
        practiceLessons: data.practiceLessons,
        lessonDuration: data.lessonDuration ?? 90,
        theoryFormat: data.theoryFormat,
        theoryHours: data.theoryHours ?? null,
        // Cast для совместимости типов Decimal между ZenStack и Prisma
        price: data.price as unknown as Decimal,
        description: data.description ?? null,
        isActive: true,
      },
    })

    return { success: true, courseId: course.id }
  } catch (error) {
    console.error('Ошибка создания курса:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Обновление курса ===

export interface UpdateCourseData {
  name?: string
  category?: LicenseCategory
  transmissionType?: TransmissionType | null
  practiceLessons?: number
  lessonDuration?: number
  theoryFormat?: TheoryFormat
  theoryHours?: number | null
  price?: number
  description?: string | null
  isActive?: boolean
}

export async function updateCourseAction(courseId: string, data: UpdateCourseData): Promise<UpdateCourseResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const course = await db.trainingCourse.findUnique({
        where: { id: courseId },
        select: { id: true, organizationId: true },
      })

      if (!course) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(course.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      // Валидация
      if (data.name !== undefined && data.name.trim().length === 0) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Название курса не может быть пустым' }
      }

      if (data.practiceLessons !== undefined && data.practiceLessons < 1) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Количество занятий должно быть больше 0' }
      }

      if (data.price !== undefined && data.price < 0) {
        return { success: false, error: 'VALIDATION_ERROR', message: 'Цена не может быть отрицательной' }
      }

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
      await schoolDb.trainingCourse.update({
        where: { id: courseId },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.category && { category: data.category }),
          ...(data.transmissionType !== undefined && { transmissionType: data.transmissionType }),
          ...(data.practiceLessons && { practiceLessons: data.practiceLessons }),
          ...(data.lessonDuration && { lessonDuration: data.lessonDuration }),
          ...(data.theoryFormat && { theoryFormat: data.theoryFormat }),
          ...(data.theoryHours !== undefined && { theoryHours: data.theoryHours }),
          ...(data.price !== undefined && {
            price: data.price as unknown as Decimal,
          }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      })

      return { success: true }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка обновления курса:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Деактивация курса ===

export async function deactivateCourseAction(courseId: string): Promise<DeleteCourseResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const course = await db.trainingCourse.findUnique({
        where: { id: courseId },
        include: {
          enrollments: {
            where: {
              progress: {
                status: 'ACTIVE',
              },
            },
          },
        },
      })

      if (!course) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(course.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      // Проверяем активные записи
      if (course.enrollments.length > 0) {
        return {
          success: false,
          error: 'HAS_ENROLLMENTS',
          message: `У курса есть ${course.enrollments.length} активных учеников. Завершите их обучение перед деактивацией.`,
        }
      }

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
      await schoolDb.trainingCourse.update({
        where: { id: courseId },
        data: { isActive: false },
      })

      return { success: true }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка деактивации курса:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Активация курса ===

export async function activateCourseAction(courseId: string): Promise<UpdateCourseResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const course = await db.trainingCourse.findUnique({
        where: { id: courseId },
        select: { id: true, organizationId: true },
      })

      if (!course) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(course.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
      await schoolDb.trainingCourse.update({
        where: { id: courseId },
        data: { isActive: true },
      })

      return { success: true }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка активации курса:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
