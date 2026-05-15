'use server'

/**
 * Server Actions для получения отзывов и проверок
 */

import { requireAuth, requireInstructor } from '@/lib/action-helpers'
import { getEnhancedPrisma, prisma } from '@/lib/db'

import type {
  CanReviewResult,
  CanReviewSchoolResult,
  GetReviewsResult,
  GetSchoolsForReviewResult,
} from './review.types'

// === Получение отзывов ===

/**
 * Отзывы текущего пользователя (его отзывы)
 */
export async function getMyReviewsAction(): Promise<GetReviewsResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  const { user } = authResult

  try {
    // ZenStack v3.2.1 баг: include с access policies генерирует невалидный SQL
    // Используем prisma напрямую с явной фильтрацией по authorId
    const reviews = await prisma.review.findMany({
      where: {
        authorId: user.id,
        status: { not: 'DELETED' },
      },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, reviews }
  } catch (error) {
    console.error('Ошибка получения отзывов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Отзывы для инструктора (отзывы о нём)
 */
export async function getInstructorReviewsAction(): Promise<GetReviewsResult> {
  const authResult = await requireInstructor()
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  const { instructorProfileId } = authResult

  try {
    // ZenStack v3.2.1 баг: include с access policies генерирует невалидный SQL
    const reviews = await prisma.review.findMany({
      where: {
        instructorId: instructorProfileId,
        targetType: 'INSTRUCTOR',
        status: 'PUBLISHED',
      },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, reviews }
  } catch (error) {
    console.error('Ошибка получения отзывов:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Отзывы для школы
 */
export async function getSchoolReviewsAction(organizationId: string): Promise<GetReviewsResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  try {
    // ZenStack v3.2.1 баг: include с access policies генерирует невалидный SQL
    const reviews = await prisma.review.findMany({
      where: {
        organizationId,
        targetType: 'SCHOOL',
        status: 'PUBLISHED',
      },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, reviews }
  } catch (error) {
    console.error('Ошибка получения отзывов школы:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Получить школы, в которых ученик может оставить отзыв
 */
export async function getSchoolsForReviewAction(): Promise<GetSchoolsForReviewResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: authResult.error }
  }

  const { user } = authResult

  try {
    // ZenStack v3.2.1 баг: include с access policies генерирует невалидный SQL
    // Получаем все школы, где пользователь - ученик
    const memberships = await prisma.member.findMany({
      where: {
        userId: user.id,
        role: 'member',
      },
      include: {
        organization: {
          select: { id: true, name: true, logo: true },
        },
      },
    })

    // Получаем существующие отзывы
    const existingReviews = await prisma.review.findMany({
      where: {
        authorId: user.id,
        targetType: 'SCHOOL',
        organizationId: { in: memberships.map((m) => m.organizationId) },
      },
      select: { organizationId: true },
    })

    const reviewedSchoolIds = new Set(existingReviews.map((r) => r.organizationId))

    const schools = memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      logo: m.organization.logo,
      hasReview: reviewedSchoolIds.has(m.organizationId),
    }))

    return { success: true, schools }
  } catch (error) {
    console.error('Ошибка получения школ для отзыва:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

// === Проверки возможности оставить отзыв ===

/**
 * Проверка, можно ли оставить отзыв на школу
 */
export async function canReviewSchoolAction(organizationId: string): Promise<CanReviewSchoolResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { canReview: false, reason: 'Необходимо войти в систему' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, logo: true },
    })

    if (!organization) {
      return { canReview: false, reason: 'Школа не найдена' }
    }

    // Проверяем членство в школе
    const membership = await db.member.findFirst({
      where: {
        organizationId,
        userId: user.id,
        role: 'member',
      },
    })

    if (!membership) {
      return { canReview: false, reason: 'Вы не являетесь учеником этой школы' }
    }

    // Проверяем, есть ли уже отзыв
    const existingReview = await db.review.findFirst({
      where: {
        authorId: user.id,
        organizationId,
        targetType: 'SCHOOL',
      },
    })

    if (existingReview) {
      return { canReview: false, reason: 'Вы уже оставили отзыв на эту школу' }
    }

    return { canReview: true, organization }
  } catch {
    return { canReview: false, reason: 'Ошибка проверки' }
  }
}

/**
 * Проверка, можно ли оставить отзыв на занятие
 */
export async function canReviewLessonAction(lessonId: string): Promise<CanReviewResult> {
  const authResult = await requireAuth()
  if (!authResult.success) {
    return { canReview: false, reason: 'Необходимо войти в систему' }
  }

  const { user } = authResult

  try {
    // ZenStack v3.2.1 баг: include с access policies генерирует невалидный SQL
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { review: true },
    })

    if (!lesson) {
      return { canReview: false, reason: 'Занятие не найдено' }
    }

    if (lesson.studentId !== user.id) {
      return { canReview: false, reason: 'Это не ваше занятие' }
    }

    if (lesson.status !== 'COMPLETED') {
      return { canReview: false, reason: 'Занятие ещё не завершено' }
    }

    if (lesson.review) {
      return { canReview: false, reason: 'Отзыв уже оставлен' }
    }

    return { canReview: true }
  } catch {
    return { canReview: false, reason: 'Ошибка проверки' }
  }
}
