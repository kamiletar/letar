'use server'

import type { LicenseCategory, TransmissionType } from '@letar/driving-school-db/prisma'

import { requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'
import { type ActionErrorCode } from '@/lib/errors'
import {
  type CategoryProgressForLicense,
  checkLicenseReadiness,
  type ExamRegistrationForLicense,
  findGibddTheoryPassedDate,
  getReadyCategories,
  type StudentProgressForLicense,
} from '@/lib/student-progress'

// === Типы для выдачи прав ===

export interface LicenseReadinessInfo {
  isReady: boolean
  readyCategories: {
    category: LicenseCategory
    transmissionRestriction: TransmissionType | null
  }[]
  reasons: string[]
  theoryExpiresAt: Date | null
  remainingDaysTheory: number | null
}

export interface IssuedLicenseInfo {
  progressId: string
  categories: {
    category: LicenseCategory
    transmissionRestriction: TransmissionType | null
    studentLicenseId: string
  }[]
  issuedAt: Date
}

// === Результаты операций ===

export type CheckLicenseReadinessResult =
  | { success: true; readiness: LicenseReadinessInfo }
  | { success: false; error: ActionErrorCode }

export type IssueLicenseResult =
  | { success: true; issued: IssuedLicenseInfo }
  | { success: false; error: ActionErrorCode; message?: string }

// === Проверка готовности к выдаче прав ===

export async function checkLicenseReadinessAction(progressId: string): Promise<CheckLicenseReadinessResult> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolManager('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const progress = await db.studentProgress.findUnique({
      where: { id: progressId },
      select: {
        id: true,
        organizationId: true,
        userId: true,
        status: true,
        documentsStatus: true,
        stateFeePaidAt: true,
        theoryStatus: true,
        licenseIssuedAt: true,
      },
    })

    if (!progress) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем права на конкретную школу
    const schoolAuthResult = await requireSchoolManager(progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    if (progress.licenseIssuedAt) {
      return {
        success: true,
        readiness: {
          isReady: false,
          readyCategories: [],
          reasons: ['Права уже выданы'],
          theoryExpiresAt: null,
          remainingDaysTheory: null,
        },
      }
    }

    // Получаем прогресс по категориям
    const categoryProgresses = await schoolDb.categoryProgress.findMany({
      where: { progressId },
      select: {
        id: true,
        category: true,
        practiceStatus: true,
        instructorApprovalStatus: true,
        transmissionRestriction: true,
      },
    })

    // Получаем попытки экзаменов через ExamAttempt
    const examAttempts = await schoolDb.examAttempt.findMany({
      where: {
        userId: progress.userId,
        OR: [
          { registration: { studentProgressId: progressId } },
          { registration: { categoryProgressId: { in: categoryProgresses.map((cp) => cp.id) } } },
        ],
      },
      include: {
        session: { select: { type: true } },
        registration: { select: { categoryProgressId: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Преобразуем к нужному формату для библиотеки
    const progressData: StudentProgressForLicense = {
      status: progress.status,
      documentsStatus: progress.documentsStatus,
      stateFeePaidAt: progress.stateFeePaidAt,
      theoryStatus: progress.theoryStatus,
    }

    const categoryProgressData: CategoryProgressForLicense[] = categoryProgresses.map((cp) => ({
      id: cp.id,
      category: cp.category,
      practiceStatus: cp.practiceStatus,
      instructorApprovalStatus: cp.instructorApprovalStatus,
    }))

    // Группируем попытки по регистрации для создания ExamRegistrationForLicense
    const examRegs: ExamRegistrationForLicense[] = examAttempts.map((a) => ({
      session: { type: a.session.type },
      attempt: {
        result: a.result,
        gradedAt: a.gradedAt,
        createdAt: a.createdAt,
      },
      categoryProgressId: a.registration.categoryProgressId,
    }))

    // Проверяем готовность
    const readinessResult = checkLicenseReadiness(progressData, categoryProgressData, examRegs)

    // Получаем дату сдачи теории
    const theoryRegs = examRegs.filter((r) => r.session.type === 'GIBDD_THEORY')
    const theoryPassedAt = findGibddTheoryPassedDate(theoryRegs)

    let theoryExpiresAt: Date | null = null
    let remainingDaysTheory: number | null = null

    if (theoryPassedAt) {
      theoryExpiresAt = new Date(theoryPassedAt)
      theoryExpiresAt.setDate(theoryExpiresAt.getDate() + 180)
      remainingDaysTheory = Math.ceil((theoryExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    }

    // Получаем готовые категории с transmissionRestriction
    const readyCategoriesData = getReadyCategories(readinessResult)
    const readyCategories = readyCategoriesData.map((rc) => {
      const cp = categoryProgresses.find((c) => c.category === rc.category)
      return {
        category: rc.category,
        transmissionRestriction: cp?.transmissionRestriction ?? null,
      }
    })

    return {
      success: true,
      readiness: {
        isReady: readinessResult.isReady,
        readyCategories,
        reasons: readinessResult.reasons,
        theoryExpiresAt,
        remainingDaysTheory,
      },
    }
  } catch (error) {
    console.error('Ошибка проверки готовности к выдаче:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Выдача прав (все категории) ===

export async function issueLicenseAction(progressId: string): Promise<IssueLicenseResult> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolManager('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const progress = await db.studentProgress.findUnique({
      where: { id: progressId },
      select: {
        id: true,
        organizationId: true,
        userId: true,
        status: true,
        documentsStatus: true,
        stateFeePaidAt: true,
        theoryStatus: true,
        licenseIssuedAt: true,
        user: {
          select: {
            studentProfile: {
              select: { id: true },
            },
          },
        },
      },
    })

    if (!progress) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем права на конкретную школу
    const schoolAuthResult = await requireSchoolManager(progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    if (progress.licenseIssuedAt) {
      return { success: false, error: 'ALREADY_ISSUED', message: 'Права уже выданы' }
    }

    // Проверяем наличие профиля студента
    if (!progress.user.studentProfile) {
      return {
        success: false,
        error: 'STUDENT_PROFILE_NOT_FOUND',
        message: 'У пользователя нет профиля студента',
      }
    }

    const studentProfileId = progress.user.studentProfile.id

    // Получаем прогресс по категориям
    const categoryProgresses = await schoolDb.categoryProgress.findMany({
      where: { progressId },
      select: {
        id: true,
        category: true,
        practiceStatus: true,
        instructorApprovalStatus: true,
        transmissionRestriction: true,
      },
    })

    // Получаем попытки экзаменов
    const examAttempts = await schoolDb.examAttempt.findMany({
      where: {
        userId: progress.userId,
        OR: [
          { registration: { studentProgressId: progressId } },
          { registration: { categoryProgressId: { in: categoryProgresses.map((cp) => cp.id) } } },
        ],
      },
      include: {
        session: { select: { type: true } },
        registration: { select: { categoryProgressId: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Преобразуем к нужному формату
    const progressData: StudentProgressForLicense = {
      status: progress.status,
      documentsStatus: progress.documentsStatus,
      stateFeePaidAt: progress.stateFeePaidAt,
      theoryStatus: progress.theoryStatus,
    }

    const categoryProgressData: CategoryProgressForLicense[] = categoryProgresses.map((cp) => ({
      id: cp.id,
      category: cp.category,
      practiceStatus: cp.practiceStatus,
      instructorApprovalStatus: cp.instructorApprovalStatus,
    }))

    const examRegs: ExamRegistrationForLicense[] = examAttempts.map((a) => ({
      session: { type: a.session.type },
      attempt: {
        result: a.result,
        gradedAt: a.gradedAt,
        createdAt: a.createdAt,
      },
      categoryProgressId: a.registration.categoryProgressId,
    }))

    const readinessResult = checkLicenseReadiness(progressData, categoryProgressData, examRegs)
    const readyCategoriesData = getReadyCategories(readinessResult)

    if (readyCategoriesData.length === 0) {
      return { success: false, error: 'NO_CATEGORIES', message: 'Нет готовых категорий для выдачи' }
    }

    const issuedAt = new Date()
    const expiresAt = new Date(issuedAt)
    expiresAt.setFullYear(expiresAt.getFullYear() + 10) // Права действуют 10 лет

    const issuedCategories: {
      category: LicenseCategory
      transmissionRestriction: TransmissionType | null
      studentLicenseId: string
    }[] = []

    // ZenStack v3: $transaction не поддерживается напрямую, используем последовательные операции
    // Создаём StudentLicense для каждой категории
    for (const rc of readyCategoriesData) {
      const cp = categoryProgresses.find((c) => c.category === rc.category)

      const license = await schoolDb.studentLicense.create({
        data: {
          studentProfileId,
          category: rc.category,
          transmissionRestriction: cp?.transmissionRestriction ?? null,
          obtainedAt: issuedAt,
          expiresAt,
          isVerified: true, // Школа подтверждает
        },
      })

      issuedCategories.push({
        category: rc.category,
        transmissionRestriction: cp?.transmissionRestriction ?? null,
        studentLicenseId: license.id,
      })
    }

    // Обновляем прогресс
    await schoolDb.studentProgress.update({
      where: { id: progressId },
      data: {
        status: 'COMPLETED',
        licenseIssuedAt: issuedAt,
        licenseIssuedById: schoolAuthResult.user.id,
      },
    })

    return {
      success: true,
      issued: {
        progressId,
        categories: issuedCategories,
        issuedAt,
      },
    }
  } catch (error) {
    console.error('Ошибка выдачи прав:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Частичная выдача прав (только указанные категории) ===

export interface IssuePartialLicenseData {
  progressId: string
  categories: LicenseCategory[]
}

export async function issuePartialLicenseAction(data: IssuePartialLicenseData): Promise<IssueLicenseResult> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolManager('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    const progress = await db.studentProgress.findUnique({
      where: { id: data.progressId },
      select: {
        id: true,
        organizationId: true,
        userId: true,
        status: true,
        documentsStatus: true,
        stateFeePaidAt: true,
        theoryStatus: true,
        licenseIssuedAt: true,
        user: {
          select: {
            studentProfile: {
              select: { id: true },
            },
          },
        },
      },
    })

    if (!progress) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем права на конкретную школу
    const schoolAuthResult = await requireSchoolManager(progress.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    if (!progress.user.studentProfile) {
      return {
        success: false,
        error: 'STUDENT_PROFILE_NOT_FOUND',
        message: 'У пользователя нет профиля студента',
      }
    }

    const studentProfileId = progress.user.studentProfile.id

    if (data.categories.length === 0) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Укажите хотя бы одну категорию' }
    }

    // Получаем прогресс по указанным категориям
    const categoryProgresses = await schoolDb.categoryProgress.findMany({
      where: {
        progressId: data.progressId,
        category: { in: data.categories },
      },
      select: {
        id: true,
        category: true,
        practiceStatus: true,
        instructorApprovalStatus: true,
        transmissionRestriction: true,
      },
    })

    // Проверяем, что все указанные категории существуют
    const existingCategories = categoryProgresses.map((cp) => cp.category)
    const invalidCategories = data.categories.filter((c) => !existingCategories.includes(c))

    if (invalidCategories.length > 0) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: `Категории не найдены: ${invalidCategories.join(', ')}`,
      }
    }

    // Получаем попытки экзаменов
    const examAttempts = await schoolDb.examAttempt.findMany({
      where: {
        userId: progress.userId,
        OR: [
          { registration: { studentProgressId: data.progressId } },
          { registration: { categoryProgressId: { in: categoryProgresses.map((cp) => cp.id) } } },
        ],
      },
      include: {
        session: { select: { type: true } },
        registration: { select: { categoryProgressId: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Преобразуем к нужному формату
    const progressData: StudentProgressForLicense = {
      status: progress.status,
      documentsStatus: progress.documentsStatus,
      stateFeePaidAt: progress.stateFeePaidAt,
      theoryStatus: progress.theoryStatus,
    }

    const categoryProgressData: CategoryProgressForLicense[] = categoryProgresses.map((cp) => ({
      id: cp.id,
      category: cp.category,
      practiceStatus: cp.practiceStatus,
      instructorApprovalStatus: cp.instructorApprovalStatus,
    }))

    const examRegs: ExamRegistrationForLicense[] = examAttempts.map((a) => ({
      session: { type: a.session.type },
      attempt: {
        result: a.result,
        gradedAt: a.gradedAt,
        createdAt: a.createdAt,
      },
      categoryProgressId: a.registration.categoryProgressId,
    }))

    const readinessResult = checkLicenseReadiness(progressData, categoryProgressData, examRegs)
    const readyCategoriesData = getReadyCategories(readinessResult)
    const readyCategoryNames = readyCategoriesData.map((rc) => rc.category)

    const notReadyCategories = data.categories.filter((c) => !readyCategoryNames.includes(c))

    if (notReadyCategories.length > 0) {
      return {
        success: false,
        error: 'NOT_READY',
        message: `Категории не готовы к выдаче: ${notReadyCategories.join(', ')}`,
      }
    }

    const issuedAt = new Date()
    const expiresAt = new Date(issuedAt)
    expiresAt.setFullYear(expiresAt.getFullYear() + 10)

    const issuedCategories: {
      category: LicenseCategory
      transmissionRestriction: TransmissionType | null
      studentLicenseId: string
    }[] = []

    // ZenStack v3: $transaction не поддерживается напрямую, используем последовательные операции
    for (const category of data.categories) {
      const cp = categoryProgresses.find((c) => c.category === category)
      if (!cp) {
        continue
      }

      const license = await schoolDb.studentLicense.create({
        data: {
          studentProfileId,
          category: cp.category,
          transmissionRestriction: cp.transmissionRestriction,
          obtainedAt: issuedAt,
          expiresAt,
          isVerified: true,
        },
      })

      issuedCategories.push({
        category: cp.category,
        transmissionRestriction: cp.transmissionRestriction,
        studentLicenseId: license.id,
      })
    }

    // Проверяем, все ли категории выданы
    const allCategoryProgress = await schoolDb.categoryProgress.findMany({
      where: { progressId: data.progressId },
      select: { category: true },
    })

    const allCategories = allCategoryProgress.map((cp) => cp.category)
    const remainingCategories = allCategories.filter((c) => !data.categories.includes(c))

    if (remainingCategories.length === 0) {
      // Все категории выданы — завершаем обучение
      await schoolDb.studentProgress.update({
        where: { id: data.progressId },
        data: {
          status: 'COMPLETED',
          licenseIssuedAt: issuedAt,
          licenseIssuedById: schoolAuthResult.user.id,
        },
      })
    }

    return {
      success: true,
      issued: {
        progressId: data.progressId,
        categories: issuedCategories,
        issuedAt,
      },
    }
  } catch (error) {
    console.error('Ошибка частичной выдачи прав:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
