'use server'

/**
 * Server Actions для управления статусом теоретических занятий
 */

import { requireSchoolAdmin, requireSchoolMember } from '@/lib/action-helpers'
import { getEnhancedPrisma, prisma } from '@/lib/db'

// === Отмена занятия ===

export async function cancelTheoryLessonAction(
  lessonId: string,
  reason: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolAdmin('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    // ZenStack v3.2.1 баг: include с relations генерирует невалидный SQL
    // Используем prisma напрямую для запросов с relations
    const lesson = await prisma.theoryLesson.findUnique({
      where: { id: lessonId },
      include: {
        group: { select: { organizationId: true } },
      },
    })

    if (!lesson) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем, что пользователь — админ школы
    const schoolAuthResult = await requireSchoolAdmin(lesson.group.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Можно отменить только запланированные занятия
    if (lesson.status !== 'SCHEDULED') {
      return { success: false, error: 'CANNOT_CANCEL' }
    }

    await schoolDb.theoryLesson.update({
      where: { id: lessonId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка отмены занятия:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Перенос занятия ===

export async function rescheduleTheoryLessonAction(
  lessonId: string,
  newScheduledAt: Date
): Promise<{
  success: boolean
  newLessonId?: string
  error?: string
}> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolAdmin('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    // ZenStack v3.2.1 баг: include с relations генерирует невалидный SQL
    // Используем prisma напрямую для запросов с relations
    const lesson = await prisma.theoryLesson.findUnique({
      where: { id: lessonId },
      include: {
        group: { select: { organizationId: true } },
      },
    })

    if (!lesson) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем, что пользователь — админ школы
    const schoolAuthResult = await requireSchoolAdmin(lesson.group.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Можно перенести только запланированные занятия
    if (lesson.status !== 'SCHEDULED') {
      return { success: false, error: 'CANNOT_RESCHEDULE' }
    }

    // ZenStack v3: $transaction не поддерживается напрямую
    // Создаём новое занятие
    const newLesson = await schoolDb.theoryLesson.create({
      data: {
        groupId: lesson.groupId,
        topicId: lesson.topicId,
        scheduledAt: newScheduledAt,
        duration: lesson.duration,
        instructorId: lesson.instructorId,
        location: lesson.location,
        status: 'SCHEDULED',
      },
    })

    // Обновляем старое занятие
    await schoolDb.theoryLesson.update({
      where: { id: lessonId },
      data: {
        status: 'RESCHEDULED',
        rescheduledToId: newLesson.id,
      },
    })

    return { success: true, newLessonId: newLesson.id }
  } catch (error) {
    console.error('Ошибка переноса занятия:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Начало занятия ===

export async function startTheoryLessonAction(lessonId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolMember('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    // ZenStack v3.2.1 баг: include с relations генерирует невалидный SQL
    // Используем prisma напрямую для запросов с relations
    const lesson = await prisma.theoryLesson.findUnique({
      where: { id: lessonId },
      include: {
        group: { select: { organizationId: true } },
      },
    })

    if (!lesson) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем членство в школе (админы и инструкторы могут начинать занятия)
    // Используем requireSchoolMember, так как нет специального helper для ADMIN|INSTRUCTOR
    const schoolAuthResult = await requireSchoolMember(lesson.group.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Дополнительная проверка роли (ADMIN или INSTRUCTOR)
    const membership = await schoolDb.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: lesson.group.organizationId,
          userId: schoolAuthResult.user.id,
        },
      },
    })

    // Роли: owner, super_manager, manager, instructor, theory_instructor
    const allowedRoles = ['owner', 'super_manager', 'manager', 'instructor', 'theory_instructor']
    if (!membership || !allowedRoles.includes(membership.role)) {
      return { success: false, error: 'ACCESS_DENIED' }
    }

    if (lesson.status !== 'SCHEDULED') {
      return { success: false, error: 'CANNOT_START' }
    }

    await schoolDb.theoryLesson.update({
      where: { id: lessonId },
      data: { status: 'IN_PROGRESS' },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка начала занятия:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Завершение занятия ===

export async function completeTheoryLessonAction(lessonId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolMember('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    // ZenStack v3.2.1 баг: include с relations генерирует невалидный SQL
    // Используем prisma напрямую для запросов с relations
    const lesson = await prisma.theoryLesson.findUnique({
      where: { id: lessonId },
      include: {
        group: { select: { organizationId: true } },
      },
    })

    if (!lesson) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем членство в школе (админы и инструкторы могут завершать занятия)
    // Используем requireSchoolMember, так как нет специального helper для ADMIN|INSTRUCTOR
    const schoolAuthResult = await requireSchoolMember(lesson.group.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)

    // Дополнительная проверка роли (ADMIN или INSTRUCTOR)
    const membership = await schoolDb.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId: lesson.group.organizationId,
          userId: schoolAuthResult.user.id,
        },
      },
    })

    // Роли: owner, super_manager, manager, instructor, theory_instructor
    const allowedRoles = ['owner', 'super_manager', 'manager', 'instructor', 'theory_instructor']
    if (!membership || !allowedRoles.includes(membership.role)) {
      return { success: false, error: 'ACCESS_DENIED' }
    }

    if (lesson.status !== 'IN_PROGRESS' && lesson.status !== 'SCHEDULED') {
      return { success: false, error: 'CANNOT_COMPLETE' }
    }

    await schoolDb.theoryLesson.update({
      where: { id: lessonId },
      data: { status: 'COMPLETED' },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка завершения занятия:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
