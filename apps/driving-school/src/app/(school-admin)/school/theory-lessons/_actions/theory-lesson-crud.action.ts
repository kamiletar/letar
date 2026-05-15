'use server'

/**
 * Server Actions для CRUD операций с теоретическими занятиями
 */

import { requireSchoolAdmin } from '@/lib/action-helpers'
import { getEnhancedPrisma, prisma } from '@/lib/db'

import type { TheoryLessonFormData } from '../_schemas/theory-lesson.schema'

// === Создание нового занятия ===

export async function createTheoryLessonAction(data: TheoryLessonFormData): Promise<{
  success: boolean
  lessonId?: string
  error?: string
}> {
  try {
    // Проверяем авторизацию
    const authResult = await requireSchoolAdmin('')
    if (!authResult.success) {
      return { success: false, error: authResult.error }
    }

    const db = getEnhancedPrisma(authResult.user)

    // Получаем группу и проверяем доступ
    const group = await db.studyGroup.findUnique({
      where: { id: data.groupId },
      select: { organizationId: true },
    })

    if (!group) {
      return { success: false, error: 'GROUP_NOT_FOUND' }
    }

    // Проверяем, что пользователь — админ школы
    const schoolAuthResult = await requireSchoolAdmin(group.organizationId)
    if (!schoolAuthResult.success) {
      return { success: false, error: schoolAuthResult.error }
    }

    const schoolDb = getEnhancedPrisma(schoolAuthResult.user)
    // Проверяем, что тема существует и принадлежит этой школе
    const topic = await schoolDb.theoryTopic.findUnique({
      where: { id: data.topicId },
      select: { organizationId: true },
    })

    if (!topic || topic.organizationId !== group.organizationId) {
      return { success: false, error: 'TOPIC_NOT_FOUND' }
    }

    const lesson = await schoolDb.theoryLesson.create({
      data: {
        groupId: data.groupId,
        topicId: data.topicId,
        scheduledAt: data.scheduledAt,
        duration: data.duration,
        instructorId: data.instructorId || null,
        location: data.location || null,
        status: 'SCHEDULED',
      },
    })

    return { success: true, lessonId: lesson.id }
  } catch (error) {
    console.error('Ошибка создания занятия:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Обновление занятия ===

export async function updateTheoryLessonAction(
  lessonId: string,
  data: Partial<TheoryLessonFormData>
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

    // Нельзя редактировать отменённые или перенесённые занятия
    if (lesson.status === 'CANCELLED' || lesson.status === 'RESCHEDULED') {
      return { success: false, error: 'CANNOT_EDIT' }
    }

    await schoolDb.theoryLesson.update({
      where: { id: lessonId },
      data: {
        topicId: data.topicId,
        scheduledAt: data.scheduledAt,
        duration: data.duration,
        instructorId: data.instructorId,
        location: data.location,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка обновления занятия:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Удаление занятия (только для занятий без посещаемости) ===

export async function deleteTheoryLessonAction(lessonId: string): Promise<{
  success: boolean
  error?: string
  message?: string
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
        // ZenStack v3: _count не поддерживается, используем include
        attendances: { select: { id: true } },
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

    // Нельзя удалить занятие с посещаемостью
    // ZenStack v3: используем .length вместо _count
    if (lesson.attendances.length > 0) {
      return {
        success: false,
        error: 'HAS_ATTENDANCE',
        message: 'Невозможно удалить занятие: есть записи о посещаемости. Используйте отмену.',
      }
    }

    // Нельзя удалить завершённые занятия
    if (lesson.status === 'COMPLETED') {
      return {
        success: false,
        error: 'COMPLETED_LESSON',
        message: 'Невозможно удалить завершённое занятие.',
      }
    }

    await schoolDb.theoryLesson.delete({
      where: { id: lessonId },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка удаления занятия:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
