'use server'

import type {
  DocumentsStatus,
  LicenseCategory,
  ProgressStatus,
  TheoryStatus,
  TransmissionType,
} from '@letar/driving-school-db/prisma'

import { requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import { type ActionErrorCode } from '@/lib/errors'
import type { CategoryProgressSummary } from '../_lib/category-transformer'
import { transformCategoryProgressList } from '../_lib/category-transformer'
import { calculateOverallProgress } from '../_lib/progress-calculator'

// === Типы для прогресса ученика ===

export interface StudentProgressSummary {
  id: string
  userId: string
  user: {
    id: string
    name: string | null
    image: string | null
    email: string | null
    phone: string | null
  }
  status: ProgressStatus
  documentsStatus: DocumentsStatus
  theoryStatus: TheoryStatus
  documentsLocation: { id: string; name: string } | null
  theoryLocation: { id: string; name: string } | null
  studyGroup: { id: string; name: string } | null
  categories: CategoryProgressSummary[]
  enrolledAt: Date
  licenseIssuedAt: Date | null
  overallProgress: number // 0-100%
}

export interface StudentProgressDetails extends StudentProgressSummary {
  // Документы
  documentsChecklist: Record<string, boolean> | null
  documentsReadyAt: Date | null
  documentsNote: string | null

  // Госпошлина
  stateFeeAmount: number | null
  stateFeePaidAt: Date | null
  stateFeeReceipt: string | null

  // ГИБДД
  docsSubmittedToGibdd: boolean
  docsSubmittedAt: Date | null
  gibddApplicationNumber: string | null

  // Теория
  theoryStartedAt: Date | null
  theoryCompletedAt: Date | null
  theoryAttendanceRate: number | null

  // Отчисление
  expelledAt: Date | null
  expelledReason: string | null

  // Метаданные
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

// === Результаты операций ===

export type GetStudentProgressListResult =
  | { success: true; students: StudentProgressSummary[]; hasMore: boolean; total: number }
  | { success: false; error: ActionErrorCode }

export type GetStudentProgressResult =
  | { success: true; progress: StudentProgressDetails }
  | { success: false; error: ActionErrorCode }

export type CreateStudentProgressResult =
  | { success: true; progressId: string }
  | { success: false; error: ActionErrorCode; message?: string }

export type UpdateStudentProgressResult =
  | { success: true }
  | { success: false; error: ActionErrorCode; message?: string }

// === Фильтры для списка ===

// Лимит записей для предотвращения переполнения памяти
const PROGRESS_PAGE_SIZE = 50

export interface ProgressFilters {
  status?: ProgressStatus
  documentsStatus?: DocumentsStatus
  theoryStatus?: TheoryStatus
  category?: LicenseCategory
  locationId?: string
  search?: string
  page?: number // Пагинация: номер страницы (0-based)
}

// === Получение списка учеников с прогрессом ===

export async function getSchoolStudentsProgressAction(
  schoolId: string,
  filters?: ProgressFilters
): Promise<GetStudentProgressListResult> {
  try {
    const authResult = await requireSchoolManager(schoolId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    // ZenStack v3.2.x баг: глубокий nested include с access policies генерирует невалидный SQL
    // Ошибка: "таблица StudentProgress$user$sub отсутствует в предложении FROM"
    // Используем prisma напрямую — access control обеспечивается проверкой requireSchoolManager выше

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { organizationId: schoolId }

    if (filters?.status) {
      where.status = filters.status
    }
    if (filters?.documentsStatus) {
      where.documentsStatus = filters.documentsStatus
    }
    if (filters?.theoryStatus) {
      where.theoryStatus = filters.theoryStatus
    }
    if (filters?.locationId) {
      where.OR = [{ documentsTeamId: filters.locationId }, { theoryTeamId: filters.locationId }]
    }
    if (filters?.search) {
      where.user = {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
          { phone: { contains: filters.search } },
        ],
      }
    }
    if (filters?.category) {
      where.categoryProgress = {
        some: { category: filters.category },
      }
    }

    // Пагинация
    const page = filters?.page ?? 0
    const skip = page * PROGRESS_PAGE_SIZE

    // Получаем общее количество для информации о пагинации
    const total = await prisma.studentProgress.count({ where })

    const progressList = await prisma.studentProgress.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, image: true, email: true, phone: true },
        },
        documentsLocation: {
          select: { id: true, name: true },
        },
        theoryLocation: {
          select: { id: true, name: true },
        },
        studyGroup: {
          select: { id: true, name: true },
        },
        // Упрощённый include — убрали courseEnrollments для списка
        // Детали курсов загружаются отдельно при просмотре конкретного ученика
        categoryProgress: {
          include: {
            instructor: {
              select: { id: true, user: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { enrolledAt: 'desc' }],
      take: PROGRESS_PAGE_SIZE,
      skip,
    })

    const summaries: StudentProgressSummary[] = progressList.map((p) => ({
      id: p.id,
      userId: p.userId,
      user: p.user,
      status: p.status,
      documentsStatus: p.documentsStatus,
      theoryStatus: p.theoryStatus,
      documentsLocation: p.documentsLocation,
      theoryLocation: p.theoryLocation,
      studyGroup: p.studyGroup,
      categories: transformCategoryProgressList(p.categoryProgress),
      enrolledAt: p.enrolledAt,
      licenseIssuedAt: p.licenseIssuedAt,
      overallProgress: calculateOverallProgress(p),
    }))

    const hasMore = skip + progressList.length < total
    return { success: true, students: summaries, hasMore, total }
  } catch (error) {
    console.error('Ошибка получения списка прогресса:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение прогресса конкретного ученика ===

export async function getStudentProgressAction(userId: string, schoolId: string): Promise<GetStudentProgressResult> {
  try {
    const authResult = await requireSchoolManager(schoolId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)
    const progress = await db.studentProgress.findUnique({
      where: {
        userId_organizationId: { userId, organizationId: schoolId },
      },
      include: {
        user: {
          select: { id: true, name: true, image: true, email: true, phone: true },
        },
        documentsLocation: {
          select: { id: true, name: true },
        },
        theoryLocation: {
          select: { id: true, name: true },
        },
        studyGroup: {
          select: { id: true, name: true },
        },
        categoryProgress: {
          include: {
            instructor: {
              select: { id: true, user: { select: { name: true } } },
            },
            courseEnrollments: {
              include: {
                course: {
                  select: { practiceLessons: true },
                },
              },
            },
          },
        },
      },
    })

    if (!progress) {
      return { success: false, error: 'NOT_FOUND' }
    }

    const details: StudentProgressDetails = {
      id: progress.id,
      userId: progress.userId,
      user: progress.user,
      status: progress.status,
      documentsStatus: progress.documentsStatus,
      theoryStatus: progress.theoryStatus,
      documentsLocation: progress.documentsLocation,
      theoryLocation: progress.theoryLocation,
      studyGroup: progress.studyGroup,
      categories: transformCategoryProgressList(progress.categoryProgress),
      enrolledAt: progress.enrolledAt,
      licenseIssuedAt: progress.licenseIssuedAt,
      overallProgress: calculateOverallProgress(progress),
      // Документы
      documentsChecklist: progress.documentsChecklist as Record<string, boolean> | null,
      documentsReadyAt: progress.documentsReadyAt,
      documentsNote: progress.documentsNote,
      // Госпошлина
      stateFeeAmount: progress.stateFeeAmount ? Number(progress.stateFeeAmount) : null,
      stateFeePaidAt: progress.stateFeePaidAt,
      stateFeeReceipt: progress.stateFeeReceipt,
      // ГИБДД
      docsSubmittedToGibdd: progress.docsSubmittedToGibdd,
      docsSubmittedAt: progress.docsSubmittedAt,
      gibddApplicationNumber: progress.gibddApplicationNumber,
      // Теория
      theoryStartedAt: progress.theoryStartedAt,
      theoryCompletedAt: progress.theoryCompletedAt,
      theoryAttendanceRate: progress.theoryAttendanceRate,
      // Отчисление
      expelledAt: progress.expelledAt,
      expelledReason: progress.expelledReason,
      // Метаданные
      notes: progress.notes,
      createdAt: progress.createdAt,
      updatedAt: progress.updatedAt,
    }

    return { success: true, progress: details }
  } catch (error) {
    console.error('Ошибка получения прогресса ученика:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение прогресса по ID ===

export async function getStudentProgressByIdAction(progressId: string): Promise<GetStudentProgressResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
      const db = getEnhancedPrisma(authResult.user)
      const progress = await db.studentProgress.findUnique({
        where: { id: progressId },
        include: {
          user: {
            select: { id: true, name: true, image: true, email: true, phone: true },
          },
          documentsLocation: {
            select: { id: true, name: true },
          },
          theoryLocation: {
            select: { id: true, name: true },
          },
          studyGroup: {
            select: { id: true, name: true },
          },
          categoryProgress: {
            include: {
              instructor: {
                select: { id: true, user: { select: { name: true } } },
              },
              courseEnrollments: {
                include: {
                  course: {
                    select: { practiceLessons: true },
                  },
                },
              },
            },
          },
        },
      })

      if (!progress) {
        return { success: false, error: 'NOT_FOUND' }
      }

      const schoolAuthResult = await requireSchoolManager(progress.organizationId)
      if (!schoolAuthResult.success) {
        return { success: false, error: schoolAuthResult.error }
      }

      const details: StudentProgressDetails = {
        id: progress.id,
        userId: progress.userId,
        user: progress.user,
        status: progress.status,
        documentsStatus: progress.documentsStatus,
        theoryStatus: progress.theoryStatus,
        documentsLocation: progress.documentsLocation,
        theoryLocation: progress.theoryLocation,
        studyGroup: progress.studyGroup,
        categories: transformCategoryProgressList(progress.categoryProgress),
        enrolledAt: progress.enrolledAt,
        licenseIssuedAt: progress.licenseIssuedAt,
        overallProgress: calculateOverallProgress(progress),
        // Документы
        documentsChecklist: progress.documentsChecklist as Record<string, boolean> | null,
        documentsReadyAt: progress.documentsReadyAt,
        documentsNote: progress.documentsNote,
        // Госпошлина
        stateFeeAmount: progress.stateFeeAmount ? Number(progress.stateFeeAmount) : null,
        stateFeePaidAt: progress.stateFeePaidAt,
        stateFeeReceipt: progress.stateFeeReceipt,
        // ГИБДД
        docsSubmittedToGibdd: progress.docsSubmittedToGibdd,
        docsSubmittedAt: progress.docsSubmittedAt,
        gibddApplicationNumber: progress.gibddApplicationNumber,
        // Теория
        theoryStartedAt: progress.theoryStartedAt,
        theoryCompletedAt: progress.theoryCompletedAt,
        theoryAttendanceRate: progress.theoryAttendanceRate,
        // Отчисление
        expelledAt: progress.expelledAt,
        expelledReason: progress.expelledReason,
        // Метаданные
        notes: progress.notes,
        createdAt: progress.createdAt,
        updatedAt: progress.updatedAt,
      }

      return { success: true, progress: details }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка получения прогресса по ID:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Создание прогресса ученика ===

export interface CreateStudentProgressData {
  userId: string
  schoolId: string
  documentsTeamId?: string | null
  theoryTeamId?: string | null
  studyGroupId?: string | null
  notes?: string | null
}

export async function createStudentProgressAction(
  data: CreateStudentProgressData
): Promise<CreateStudentProgressResult> {
  try {
    const authResult = await requireSchoolManager(data.schoolId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    // Проверяем, что пользователь является членом школы
    const membership = await db.member.findFirst({
      where: {
        userId: data.userId,
        organizationId: data.schoolId,
      },
    })

    if (!membership) {
      return { success: false, error: 'USER_NOT_MEMBER', message: 'Пользователь не является членом школы' }
    }

    // Проверяем, что прогресс ещё не создан
    const existingProgress = await db.studentProgress.findUnique({
      where: {
        userId_organizationId: { userId: data.userId, organizationId: data.schoolId },
      },
    })

    if (existingProgress) {
      return { success: false, error: 'ALREADY_EXISTS', message: 'Прогресс уже существует для этого ученика' }
    }

    const progress = await db.studentProgress.create({
      data: {
        userId: data.userId,
        organizationId: data.schoolId,
        documentsTeamId: data.documentsTeamId ?? null,
        theoryTeamId: data.theoryTeamId ?? null,
        studyGroupId: data.studyGroupId ?? null,
        notes: data.notes ?? null,
        status: 'ACTIVE',
        documentsStatus: 'NOT_STARTED',
        theoryStatus: 'NOT_STARTED',
      },
    })

    return { success: true, progressId: progress.id }
  } catch (error) {
    console.error('Ошибка создания прогресса:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Добавление категории в прогресс ===

export interface AddCategoryData {
  progressId: string
  category: LicenseCategory
  transmissionRestriction?: TransmissionType | null
  instructorId?: string | null
}

export async function addCategoryToProgressAction(data: AddCategoryData): Promise<CreateStudentProgressResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
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

      // Проверяем, что категория ещё не добавлена
      const existingCategory = await schoolDb.categoryProgress.findUnique({
        where: {
          progressId_category: { progressId: data.progressId, category: data.category },
        },
      })

      if (existingCategory) {
        return { success: false, error: 'ALREADY_EXISTS', message: 'Категория уже добавлена' }
      }

      const categoryProgress = await schoolDb.categoryProgress.create({
        data: {
          progressId: data.progressId,
          category: data.category,
          transmissionRestriction: data.transmissionRestriction ?? null,
          instructorId: data.instructorId ?? null,
          practiceStatus: 'NOT_STARTED',
          instructorApprovalStatus: 'NOT_REQUESTED',
        },
      })

      return { success: true, progressId: categoryProgress.id }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка добавления категории:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Обновление базовой информации прогресса ===

export interface UpdateStudentProgressData {
  documentsTeamId?: string | null
  theoryTeamId?: string | null
  studyGroupId?: string | null
  notes?: string | null
}

export async function updateStudentProgressAction(
  progressId: string,
  data: UpdateStudentProgressData
): Promise<UpdateStudentProgressResult> {
  try {
    const authResult = await requireSchoolManager('')

    if (authResult.success) {
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
      await schoolDb.studentProgress.update({
        where: { id: progressId },
        data: {
          ...(data.documentsTeamId !== undefined && { documentsTeamId: data.documentsTeamId }),
          ...(data.theoryTeamId !== undefined && { theoryTeamId: data.theoryTeamId }),
          ...(data.studyGroupId !== undefined && { studyGroupId: data.studyGroupId }),
          ...(data.notes !== undefined && { notes: data.notes }),
        },
      })

      return { success: true }
    }

    return { success: false, error: authResult.error }
  } catch (error) {
    console.error('Ошибка обновления прогресса:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
