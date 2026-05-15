'use server'

/**
 * Server Actions для получения данных о теоретических занятиях
 */

import { requireSchoolMember } from '@/lib/action-helpers'
import { prisma } from '@/lib/db'

import type { SchoolClassroom, SchoolInstructor, TheoryLessonDetails, TheoryLessonSummary } from './theory-lesson.types'

// === Получение списка занятий для группы ===

export async function getTheoryLessonsForGroupAction(groupId: string): Promise<{
  success: boolean
  lessons: TheoryLessonSummary[]
  error?: string
}> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolMember('')
    if (!authResult.success) {
      return { success: false, lessons: [], error: authResult.error }
    }

    const db = prisma

    // Получаем группу и проверяем доступ
    const group = await db.studyGroup.findUnique({
      where: { id: groupId },
      select: { organizationId: true },
    })

    if (!group) {
      return { success: false, lessons: [], error: 'GROUP_NOT_FOUND' }
    }

    // Проверяем членство в школе
    const schoolAuthResult = await requireSchoolMember(group.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, lessons: [], error: schoolAuthResult.error }
    }

    const schoolDb = prisma
    const lessons = await schoolDb.theoryLesson.findMany({
      where: { groupId },
      include: {
        group: { select: { name: true } },
        topic: { select: { name: true } },
        instructor: { select: { name: true } },
        // ZenStack v3: _count не поддерживается, используем include + вычисление .length
        attendances: { where: { isPresent: true }, select: { id: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    })

    // Получаем количество участников группы
    const membersCount = await schoolDb.studyGroupMember.count({
      where: { groupId, leftAt: null },
    })

    // ZenStack v3: приводим к типу с relations
    type LessonWithRelations = (typeof lessons)[0] & {
      group: { name: string }
      topic: { name: string } | null
      instructor: { name: string | null } | null
      attendances: { id: string }[]
    }

    return {
      success: true,
      lessons: (lessons as unknown as LessonWithRelations[]).map(
        (l): TheoryLessonSummary => ({
          id: l.id,
          groupId: l.groupId,
          groupName: l.group.name,
          topicId: l.topicId,
          topicName: l.topic?.name ?? null,
          scheduledAt: l.scheduledAt,
          duration: l.duration,
          status: l.status,
          instructorId: l.instructorId,
          instructorName: l.instructor?.name || null,
          location: l.location,
          // ZenStack v3: вычисляем count через .length
          attendeesCount: l.attendances.length,
          totalMembers: membersCount,
        })
      ),
    }
  } catch (error) {
    console.error('Ошибка получения занятий:', error)
    return { success: false, lessons: [], error: 'UNKNOWN_ERROR' }
  }
}

// === Получение списка занятий для школы ===

export async function getTheoryLessonsForSchoolAction(schoolId: string): Promise<{
  success: boolean
  lessons: TheoryLessonSummary[]
  error?: string
}> {
  try {
    // Проверяем членство в школе
    const authResult = await requireSchoolMember(schoolId)
    if (!authResult.success) {
      return { success: false, lessons: [], error: authResult.error }
    }

    const db = prisma

    const lessons = await db.theoryLesson.findMany({
      where: {
        group: { organizationId: schoolId },
      },
      include: {
        // ZenStack v3: _count не поддерживается, используем include + вычисление .length
        group: {
          select: {
            name: true,
            members: { where: { leftAt: null }, select: { id: true } },
          },
        },
        topic: { select: { name: true } },
        instructor: { select: { name: true } },
        attendances: { where: { isPresent: true }, select: { id: true } },
      },
      orderBy: { scheduledAt: 'desc' },
    })

    // ZenStack v3: приводим к типу с relations
    type LessonWithRelations = (typeof lessons)[0] & {
      group: {
        name: string
        members: { id: string }[]
      }
      topic: { name: string } | null
      instructor: { name: string | null } | null
      attendances: { id: string }[]
    }

    return {
      success: true,
      lessons: (lessons as unknown as LessonWithRelations[]).map(
        (l): TheoryLessonSummary => ({
          id: l.id,
          groupId: l.groupId,
          groupName: l.group.name,
          topicId: l.topicId,
          topicName: l.topic?.name ?? null,
          scheduledAt: l.scheduledAt,
          duration: l.duration,
          status: l.status,
          instructorId: l.instructorId,
          instructorName: l.instructor?.name || null,
          location: l.location,
          // ZenStack v3: вычисляем count через .length
          attendeesCount: l.attendances.length,
          totalMembers: l.group.members.length,
        })
      ),
    }
  } catch (error) {
    console.error('Ошибка получения занятий школы:', error)
    return { success: false, lessons: [], error: 'UNKNOWN_ERROR' }
  }
}

// === Получение детальной информации о занятии ===

export async function getTheoryLessonAction(lessonId: string): Promise<{
  success: boolean
  lesson?: TheoryLessonDetails
  error?: string
}> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolMember('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = prisma

    const lesson = await db.theoryLesson.findUnique({
      where: { id: lessonId },
      include: {
        group: { select: { name: true, organizationId: true } },
        topic: { select: { name: true } },
        instructor: { select: { name: true } },
        attendances: {
          select: {
            memberId: true,
            isPresent: true,
            markedAt: true,
            member: {
              select: {
                user: { select: { name: true, email: true } },
              },
            },
          },
        },
      },
    })

    if (!lesson) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем членство в школе
    const schoolAuthResult = await requireSchoolMember(lesson.group.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    return {
      success: true,
      lesson: {
        id: lesson.id,
        groupId: lesson.groupId,
        groupName: lesson.group.name,
        topicId: lesson.topicId,
        topicName: lesson.topic?.name ?? null,
        scheduledAt: lesson.scheduledAt,
        duration: lesson.duration,
        status: lesson.status,
        instructorId: lesson.instructorId,
        instructorName: lesson.instructor?.name || null,
        location: lesson.location,
        cancelledAt: lesson.cancelledAt,
        cancelReason: lesson.cancelReason,
        rescheduledToId: lesson.rescheduledToId,
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt,
        attendances: lesson.attendances.map((a) => ({
          memberId: a.memberId,
          memberName: a.member.user.name || 'Без имени',
          memberEmail: a.member.user.email,
          isPresent: a.isPresent,
          markedAt: a.markedAt,
        })),
      },
    }
  } catch (error) {
    console.error('Ошибка получения занятия:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Получение учебных классов школы ===

export async function getSchoolClassroomsAction(schoolId: string): Promise<{
  success: boolean
  classrooms: SchoolClassroom[]
  error?: string
}> {
  try {
    // Проверяем членство в школе
    const authResult = await requireSchoolMember(schoolId)
    if (!authResult.success) {
      return { success: false, classrooms: [], error: authResult.error }
    }

    const db = prisma

    // Ищем филиалы с типом CLASSROOM
    const teams = await db.team.findMany({
      where: { organizationId: schoolId },
      include: {
        locationData: {
          select: { type: true, isActive: true, city: true, address: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Фильтруем только активные классы
    const classrooms: SchoolClassroom[] = teams
      .filter((t) => t.locationData?.type === 'CLASSROOM' && t.locationData.isActive)
      .map((t) => ({
        id: t.id,
        name: t.name,
        address: t.locationData
          ? [t.locationData.city, t.locationData.address].filter(Boolean).join(', ') || null
          : null,
      }))

    return { success: true, classrooms }
  } catch (error) {
    console.error('Ошибка получения учебных классов:', error)
    return { success: false, classrooms: [], error: 'UNKNOWN_ERROR' }
  }
}

// === Получение доступных инструкторов школы ===

export async function getSchoolInstructorsAction(schoolId: string): Promise<{
  success: boolean
  instructors: SchoolInstructor[]
  error?: string
}> {
  try {
    // Проверяем членство в школе
    const authResult = await requireSchoolMember(schoolId)
    if (!authResult.success) {
      return { success: false, instructors: [], error: authResult.error }
    }

    const db = prisma

    const instructors = await db.member.findMany({
      where: {
        organizationId: schoolId,
        role: { in: ['owner', 'super_manager', 'manager', 'instructor'] },
      },
      select: {
        user: { select: { id: true, name: true } },
      },
    })

    return {
      success: true,
      instructors: instructors.map((i) => ({
        id: i.user.id,
        name: i.user.name || 'Без имени',
      })),
    }
  } catch (error) {
    console.error('Ошибка получения инструкторов:', error)
    return { success: false, instructors: [], error: 'UNKNOWN_ERROR' }
  }
}
