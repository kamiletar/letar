'use server'

import type { LicenseCategory } from '@letar/driving-school-db/prisma'

import { requireSchoolManager } from '@/lib/action-helpers'
import { prisma } from '@/lib/db'
import { type ActionErrorCode } from '@/lib/errors'
import type { StudentProgressSummary } from '../../_actions/progress.action'
import { transformCategoryProgressList } from '../../_lib/category-transformer'
import { calculateOverallProgress } from '../../_lib/progress-calculator'
import { groupStudentsByStage, KANBAN_COLUMNS, type KanbanStage } from '../_lib/kanban-config'

// === Типы ===

export interface KanbanColumnData {
  id: KanbanStage
  students: StudentProgressSummary[]
  count: number
}

export interface KanbanData {
  columns: KanbanColumnData[]
  stats: {
    total: number
    byStage: Record<KanbanStage, number>
  }
}

export interface KanbanFilters {
  category?: LicenseCategory
  instructorId?: string
  search?: string
}

export type GetKanbanDataResult = { success: true; data: KanbanData } | { success: false; error: ActionErrorCode }

export interface InstructorOption {
  id: string
  name: string
  studentsCount: number
}

export type GetInstructorsResult =
  | { success: true; instructors: InstructorOption[] }
  | { success: false; error: ActionErrorCode }

// === Получение данных для Kanban ===

export async function getKanbanDataAction(schoolId: string, filters?: KanbanFilters): Promise<GetKanbanDataResult> {
  try {
    const authResult = await requireSchoolManager(schoolId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = prisma // HOTFIX: ZenStack memory leak

    // Строим условия фильтрации
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { organizationId: schoolId }

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

    if (filters?.instructorId) {
      where.categoryProgress = {
        some: { instructorId: filters.instructorId },
      }
    }

    // Получаем всех учеников (без пагинации для Kanban)
    // Ограничиваем до 500 записей для производительности
    const progressList = await db.studentProgress.findMany({
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
        categoryProgress: {
          include: {
            instructor: {
              select: { id: true, user: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { enrolledAt: 'desc' }],
      take: 500,
    })

    // Преобразуем в StudentProgressSummary
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

    // Группируем по этапам
    const grouped = groupStudentsByStage(summaries)

    // Формируем данные колонок
    const columns: KanbanColumnData[] = KANBAN_COLUMNS.map((col) => ({
      id: col.id,
      students: grouped[col.id],
      count: grouped[col.id].length,
    }))

    // Статистика
    const stats = {
      total: summaries.length,
      byStage: Object.fromEntries(KANBAN_COLUMNS.map((col) => [col.id, grouped[col.id].length])) as Record<
        KanbanStage,
        number
      >,
    }

    return { success: true, data: { columns, stats } }
  } catch (error) {
    console.error('Ошибка получения данных Kanban:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение списка инструкторов для фильтра ===

export async function getKanbanInstructorsAction(schoolId: string): Promise<GetInstructorsResult> {
  try {
    const authResult = await requireSchoolManager(schoolId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = prisma // HOTFIX: ZenStack memory leak

    // Получаем членов организации с ролью 'instructor'
    const members = await db.member.findMany({
      where: { organizationId: schoolId, role: 'instructor' },
      select: { userId: true },
    })

    const instructorUserIds = members.map((m) => m.userId)

    if (instructorUserIds.length === 0) {
      return { success: true, instructors: [] }
    }

    // Получаем профили инструкторов с количеством учеников
    const instructors = await db.instructorProfile.findMany({
      where: { userId: { in: instructorUserIds } },
      select: {
        id: true,
        user: { select: { name: true } },
        _count: { select: { categoryProgress: true } },
      },
      orderBy: { user: { name: 'asc' } },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const instructorOptions: InstructorOption[] = instructors.map((i: any) => ({
      id: i.id,
      name: i.user.name ?? 'Без имени',
      studentsCount: i._count.categoryProgress,
    }))

    return { success: true, instructors: instructorOptions }
  } catch (error) {
    console.error('Ошибка получения инструкторов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
