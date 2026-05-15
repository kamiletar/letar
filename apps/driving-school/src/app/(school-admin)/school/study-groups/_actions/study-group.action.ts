'use server'

import type { LicenseCategory, StudyGroupSchedule } from '@letar/driving-school-db/prisma'

import { requireAuth, requireSchoolManager } from '@/lib/action-helpers'
import { getEnhancedPrisma, prisma } from '@/lib/db'
import type { LessonSchedule } from '@/lib/lesson-schedule'

// === Типы для учебных групп ===

export interface StudyGroupSummary {
  id: string
  name: string
  schedule: StudyGroupSchedule
  categories: LicenseCategory[]
  startDate: Date
  endDate: Date | null
  lessonSchedule: LessonSchedule
  classroomId: string | null
  classroomName: string | null
  theoryHours: number | null
  maxStudents: number
  isActive: boolean
  membersCount: number
  lessonsCount: number
  organization: {
    id: string
    name: string
  }
}

export interface StudyGroupDetails extends StudyGroupSummary {
  members: StudyGroupMemberInfo[]
  upcomingLessons: TheoryLessonInfo[]
  createdAt: Date
  updatedAt: Date
}

export interface StudyGroupMemberInfo {
  id: string
  userId: string
  userName: string
  userImage: string | null
  enrolledAt: Date
  leftAt: Date | null
  attendanceRate: number | null
}

export interface TheoryLessonInfo {
  id: string
  scheduledAt: Date
  topic: {
    id: string
    name: string
  } | null
  status: string
  attendeesCount: number
}

// === Результаты операций ===

export type GetStudyGroupsResult =
  | { success: true; groups: StudyGroupSummary[] }
  | {
      success: false
      error:
        | 'UNAUTHORIZED'
        | 'NOT_SCHOOL_ADMIN'
        | 'NOT_SCHOOL_MEMBER'
        | 'NOT_INSTRUCTOR'
        | 'NOT_OWNER'
        | 'NO_PROFILE'
        | 'UNKNOWN_ERROR'
    }

export type GetStudyGroupResult =
  | { success: true; group: StudyGroupDetails }
  | {
      success: false
      error:
        | 'UNAUTHORIZED'
        | 'NOT_SCHOOL_ADMIN'
        | 'NOT_SCHOOL_MEMBER'
        | 'NOT_INSTRUCTOR'
        | 'NOT_OWNER'
        | 'NO_PROFILE'
        | 'NOT_FOUND'
        | 'UNKNOWN_ERROR'
    }

export type CreateStudyGroupResult =
  | { success: true; groupId: string }
  | {
      success: false
      error:
        | 'UNAUTHORIZED'
        | 'NOT_SCHOOL_ADMIN'
        | 'NOT_SCHOOL_MEMBER'
        | 'NOT_INSTRUCTOR'
        | 'NOT_OWNER'
        | 'NO_PROFILE'
        | 'VALIDATION_ERROR'
        | 'UNKNOWN_ERROR'
      message?: string
    }

export type UpdateStudyGroupResult =
  | { success: true }
  | {
      success: false
      error:
        | 'UNAUTHORIZED'
        | 'NOT_SCHOOL_ADMIN'
        | 'NOT_SCHOOL_MEMBER'
        | 'NOT_INSTRUCTOR'
        | 'NOT_OWNER'
        | 'NO_PROFILE'
        | 'NOT_FOUND'
        | 'VALIDATION_ERROR'
        | 'UNKNOWN_ERROR'
      message?: string
    }

export type DeleteStudyGroupResult =
  | { success: true }
  | {
      success: false
      error:
        | 'UNAUTHORIZED'
        | 'NOT_SCHOOL_ADMIN'
        | 'NOT_SCHOOL_MEMBER'
        | 'NOT_INSTRUCTOR'
        | 'NOT_OWNER'
        | 'NO_PROFILE'
        | 'NOT_FOUND'
        | 'HAS_ACTIVE_LESSONS'
        | 'UNKNOWN_ERROR'
      message?: string
    }

// === Получение списка групп школы ===

export async function getStudyGroupsAction(schoolId: string): Promise<GetStudyGroupsResult> {
  try {
    const authResult = await requireAuth()
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    // ZenStack v3.2.1 баг: include с relations генерирует невалидный SQL
    // Используем prisma напрямую для запросов с relations
    const membership = await prisma.member.findFirst({
      where: {
        userId: authResult.user.id,
        organizationId: schoolId,
        role: { in: ['owner', 'super_manager', 'manager', 'instructor', 'theory_instructor'] },
      },
    })

    if (!membership) {
      return { success: false, error: 'NOT_SCHOOL_ADMIN' }
    }

    const groups = await prisma.studyGroup.findMany({
      where: { organizationId: schoolId },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        classroom: {
          select: { id: true, name: true },
        },
        members: {
          where: { leftAt: null }, // Только активные участники
        },
        theoryLessons: true,
      },
      orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }],
    })

    const groupSummaries: StudyGroupSummary[] = groups.map((group) => ({
      id: group.id,
      name: group.name,
      schedule: group.schedule,
      categories: group.categories,
      startDate: group.startDate,
      endDate: group.endDate,
      lessonSchedule: group.lessonSchedule as LessonSchedule,
      classroomId: group.classroomId,
      classroomName: group.classroom?.name ?? null,
      theoryHours: group.theoryHours,
      maxStudents: group.maxStudents,
      isActive: group.isActive,
      membersCount: group.members.length,
      lessonsCount: group.theoryLessons.length,
      organization: group.organization,
    }))

    return { success: true, groups: groupSummaries }
  } catch (error) {
    console.error('Ошибка получения списка групп:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение детальной информации о группе ===

export async function getStudyGroupAction(groupId: string): Promise<GetStudyGroupResult> {
  try {
    const authResult = await requireAuth()
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    // ZenStack v3.2.1 баг: include с relations генерирует невалидный SQL
    // Используем prisma напрямую для запросов с relations
    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: {
        organization: {
          select: { id: true, name: true },
        },
        classroom: {
          select: { id: true, name: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, image: true },
            },
          },
          orderBy: { enrolledAt: 'asc' },
        },
        theoryLessons: {
          where: {
            scheduledAt: { gte: new Date() },
            status: { not: 'CANCELLED' },
          },
          include: {
            topic: {
              select: { id: true, name: true },
            },
            attendances: true,
          },
          orderBy: { scheduledAt: 'asc' },
          take: 10, // Ближайшие 10 занятий
        },
      },
    })

    if (!group) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем права доступа
    const membership = await prisma.member.findFirst({
      where: {
        userId: authResult.user.id,
        organizationId: group.organizationId,
        role: { in: ['owner', 'super_manager', 'manager', 'instructor', 'theory_instructor'] },
      },
    })

    if (!membership) {
      return { success: false, error: 'NOT_SCHOOL_ADMIN' }
    }

    // Batch-запрос: все прошедшие занятия группы (1 запрос вместо N)
    const pastLessons = await prisma.theoryLesson.findMany({
      where: {
        groupId: group.id,
        scheduledAt: { lt: new Date() },
        status: 'COMPLETED',
      },
      select: { id: true },
    })
    const pastLessonIds = pastLessons.map((l) => l.id)

    // Batch-запрос: все посещения за эти занятия (1 запрос вместо N)
    const allAttendances =
      pastLessonIds.length > 0
        ? await prisma.theoryAttendance.findMany({
            where: {
              lessonId: { in: pastLessonIds },
              isPresent: true,
            },
            select: { memberId: true },
          })
        : []

    // Группируем посещения по участникам (O(N) вместо N запросов)
    const attendanceCountByMember = new Map<string, number>()
    for (const attendance of allAttendances) {
      const count = attendanceCountByMember.get(attendance.memberId) ?? 0
      attendanceCountByMember.set(attendance.memberId, count + 1)
    }

    // Формируем информацию об участниках без дополнительных запросов
    const memberInfos: StudyGroupMemberInfo[] = group.members.map((member) => {
      const attendedCount = attendanceCountByMember.get(member.id) ?? 0
      const attendanceRate = pastLessons.length > 0 ? Math.round((attendedCount / pastLessons.length) * 100) : null

      return {
        id: member.id,
        userId: member.userId,
        userName: member.user.name || 'Без имени',
        userImage: member.user.image,
        enrolledAt: member.enrolledAt,
        leftAt: member.leftAt,
        attendanceRate,
      }
    })

    const lessonInfos: TheoryLessonInfo[] = group.theoryLessons.map((lesson) => ({
      id: lesson.id,
      scheduledAt: lesson.scheduledAt,
      topic: lesson.topic,
      status: lesson.status,
      attendeesCount: lesson.attendances.filter((a) => a.isPresent).length,
    }))

    const groupDetails: StudyGroupDetails = {
      id: group.id,
      name: group.name,
      schedule: group.schedule,
      categories: group.categories,
      startDate: group.startDate,
      endDate: group.endDate,
      lessonSchedule: group.lessonSchedule as LessonSchedule,
      classroomId: group.classroomId,
      classroomName: group.classroom?.name ?? null,
      theoryHours: group.theoryHours,
      maxStudents: group.maxStudents,
      isActive: group.isActive,
      membersCount: group.members.filter((m) => !m.leftAt).length,
      lessonsCount: group.theoryLessons.length,
      organization: group.organization,
      members: memberInfos,
      upcomingLessons: lessonInfos,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }

    return { success: true, group: groupDetails }
  } catch (error) {
    console.error('Ошибка получения группы:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Создание группы ===

export interface CreateStudyGroupData {
  organizationId: string
  name: string
  schedule: StudyGroupSchedule
  categories: LicenseCategory[]
  startDate: Date
  endDate?: Date | null
  lessonSchedule: LessonSchedule
  classroomId?: string | null
  theoryHours?: number | null
  maxStudents: number
}

export async function createStudyGroupAction(data: CreateStudyGroupData): Promise<CreateStudyGroupResult> {
  try {
    const authResult = await requireSchoolManager(data.organizationId)
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    // Валидация данных
    if (!data.name || data.name.trim().length === 0) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Название группы обязательно' }
    }

    // Создаём группу и чат для неё
    // ZenStack v3: $transaction не поддерживается напрямую, используем последовательные операции
    // Создаём группу
    const newGroup = await db.studyGroup.create({
      data: {
        organizationId: data.organizationId,
        name: data.name.trim(),
        schedule: data.schedule,
        categories: data.categories,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        lessonSchedule: data.lessonSchedule as any,
        classroomId: data.classroomId || null,
        theoryHours: data.theoryHours ?? null,
        maxStudents: data.maxStudents,
        isActive: true,
      },
    })

    // Создаём чат для группы
    await db.chat.create({
      data: {
        type: 'STUDY_GROUP',
        studyGroupId: newGroup.id,
        name: newGroup.name,
        participants: {
          create: {
            userId: authResult.user.id,
            isAdmin: true,
          },
        },
      },
    })

    return { success: true, groupId: newGroup.id }
  } catch (error) {
    console.error('Ошибка создания группы:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Обновление группы ===

export interface UpdateStudyGroupData {
  name?: string
  schedule?: StudyGroupSchedule
  categories?: LicenseCategory[]
  startDate?: Date
  endDate?: Date | null
  lessonSchedule?: LessonSchedule
  classroomId?: string | null
  theoryHours?: number | null
  maxStudents?: number
  isActive?: boolean
}

export async function updateStudyGroupAction(
  groupId: string,
  data: UpdateStudyGroupData
): Promise<UpdateStudyGroupResult> {
  try {
    // Сначала получаем группу для определения школы
    const authResult = await requireAuth()
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)
    const group = await db.studyGroup.findUnique({
      where: { id: groupId },
      select: { id: true, organizationId: true },
    })

    if (!group) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Одна проверка прав на конкретную школу (вместо двух)
    const schoolAuthResult = await requireSchoolManager(group.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Валидация данных
    if (data.name !== undefined && data.name.trim().length === 0) {
      return { success: false, error: 'VALIDATION_ERROR', message: 'Название группы не может быть пустым' }
    }

    // Обновляем группу
    await schoolDb.studyGroup.update({
      where: { id: groupId },
      data: {
        ...(data.name && { name: data.name.trim() }),
        ...(data.schedule && { schedule: data.schedule }),
        ...(data.categories && { categories: data.categories }),
        ...(data.startDate && { startDate: data.startDate }),
        ...(data.endDate !== undefined && { endDate: data.endDate }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(data.lessonSchedule && { lessonSchedule: data.lessonSchedule as any }),
        ...(data.classroomId !== undefined && { classroomId: data.classroomId || null }),
        ...(data.theoryHours !== undefined && { theoryHours: data.theoryHours }),
        ...(data.maxStudents && { maxStudents: data.maxStudents }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка обновления группы:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Архивирование группы (soft delete) ===

export async function archiveStudyGroupAction(groupId: string): Promise<DeleteStudyGroupResult> {
  try {
    // Сначала получаем группу с занятиями для проверки
    const authResult = await requireAuth()
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    // ZenStack v3.2.1 баг: include с relations генерирует невалидный SQL
    // Используем prisma напрямую для запросов с relations
    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: {
        theoryLessons: {
          where: {
            scheduledAt: { gte: new Date() },
            status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          },
        },
      },
    })

    if (!group) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Одна проверка прав на конкретную школу (вместо двух)
    const schoolAuthResult = await requireSchoolManager(group.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Проверяем наличие активных занятий
    if (group.theoryLessons.length > 0) {
      return {
        success: false,
        error: 'HAS_ACTIVE_LESSONS',
        message: `У группы есть ${group.theoryLessons.length} запланированных занятий. Отмените их перед архивированием.`,
      }
    }

    // Архивируем группу (soft delete)
    await schoolDb.studyGroup.update({
      where: { id: groupId },
      data: { isActive: false },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка архивирования группы:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Восстановление группы ===

export async function restoreStudyGroupAction(groupId: string): Promise<UpdateStudyGroupResult> {
  try {
    // Сначала получаем группу для определения школы
    const authResult = await requireAuth()
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)
    const group = await db.studyGroup.findUnique({
      where: { id: groupId },
      select: { id: true, organizationId: true },
    })

    if (!group) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Одна проверка прав на конкретную школу (вместо двух)
    const schoolAuthResult = await requireSchoolManager(group.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Восстанавливаем группу
    await schoolDb.studyGroup.update({
      where: { id: groupId },
      data: { isActive: true },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка восстановления группы:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
