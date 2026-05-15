'use server'

/**
 * Server Actions для мутаций отзывов (создание, ответ, жалоба)
 */

import { revalidatePath } from 'next/cache'

import { requireAuth } from '@/lib/action-helpers'
import { getEnhancedPrisma } from '@/lib/db'

import {
  type ReviewFormData,
  ReviewFormSchema,
  type ReviewReportData,
  ReviewReportSchema,
  type ReviewResponseData,
  ReviewResponseSchema,
} from '../_schemas/review-form.schema'

import { updateInstructorRating, updateSchoolRating } from './review-utils'
import type { ReviewActionResult } from './review.types'

// === Создание отзыва ===

export async function createReviewAction(data: ReviewFormData): Promise<ReviewActionResult> {
  const parsed = ReviewFormSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    const { lessonId, organizationId, rating, text } = parsed.data

    // Отзыв на инструктора (через занятие)
    if (lessonId) {
      // Проверяем занятие
      const lesson = await db.lesson.findUnique({
        where: { id: lessonId },
        include: {
          instructor: {
            include: {
              instructorProfile: true,
            },
          },
          review: true,
        },
      })

      if (!lesson) {
        return { success: false, error: 'Занятие не найдено' }
      }

      // Проверяем, что это занятие текущего пользователя
      if (lesson.studentId !== user.id) {
        return { success: false, error: 'Вы не можете оставить отзыв на это занятие' }
      }

      // Проверяем статус занятия
      if (lesson.status !== 'COMPLETED') {
        return { success: false, error: 'Отзыв можно оставить только после завершённого занятия' }
      }

      // Проверяем, что отзыв ещё не оставлен
      if (lesson.review) {
        return { success: false, error: 'Вы уже оставили отзыв на это занятие' }
      }

      // Создаём отзыв
      await db.review.create({
        data: {
          authorId: user.id,
          targetType: 'INSTRUCTOR',
          instructorId: lesson.instructor.instructorProfile?.id,
          lessonId: lesson.id,
          rating,
          text,
        },
      })

      // Пересчитываем рейтинг инструктора
      if (lesson.instructor.instructorProfile) {
        await updateInstructorRating(db, lesson.instructor.instructorProfile.id)
      }

      revalidatePath('/lessons')
      revalidatePath('/reviews')
      return { success: true }
    }

    // Отзыв на школу
    if (organizationId) {
      // Проверяем членство в школе
      const membership = await db.member.findFirst({
        where: {
          organizationId: organizationId,
          userId: user.id,
          role: 'member',
        },
      })

      if (!membership) {
        return { success: false, error: 'Вы не являетесь учеником этой школы' }
      }

      // Проверяем, что отзыв ещё не оставлен
      const existingReview = await db.review.findFirst({
        where: {
          authorId: user.id,
          organizationId,
          targetType: 'SCHOOL',
        },
      })

      if (existingReview) {
        return { success: false, error: 'Вы уже оставили отзыв на эту школу' }
      }

      // Создаём отзыв
      await db.review.create({
        data: {
          authorId: user.id,
          targetType: 'SCHOOL',
          organizationId,
          rating,
          text,
        },
      })

      // Пересчитываем рейтинг школы
      await updateSchoolRating(db, organizationId)

      revalidatePath('/school')
      revalidatePath('/reviews')
      return { success: true }
    }

    return { success: false, error: 'Не указан объект отзыва' }
  } catch (error) {
    console.error('Ошибка создания отзыва:', error)
    return { success: false, error: 'Произошла ошибка при создании отзыва' }
  }
}

// === Ответ на отзыв ===

export async function respondToReviewAction(data: ReviewResponseData): Promise<ReviewActionResult> {
  const parsed = ReviewResponseSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Введите текст ответа' }
  }

  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    const { reviewId, response } = parsed.data

    // Получаем отзыв
    const review = await db.review.findUnique({
      where: { id: reviewId },
      include: {
        instructor: {
          include: {
            user: true,
          },
        },
        organization: {
          include: {
            members: {
              where: { role: { in: ['owner', 'super_manager', 'manager'] } },
            },
          },
        },
      },
    })

    if (!review) {
      return { success: false, error: 'Отзыв не найден' }
    }

    // Проверяем права на ответ
    let canRespond = false

    if (review.targetType === 'INSTRUCTOR' && review.instructor) {
      canRespond = review.instructor.userId === user.id
    } else if (review.targetType === 'SCHOOL' && review.organization) {
      canRespond = review.organization.members.some((m) => m.userId === user.id)
    }

    if (!canRespond) {
      return { success: false, error: 'У вас нет прав на ответ на этот отзыв' }
    }

    // Проверяем, что ответ ещё не дан
    if (review.response) {
      return { success: false, error: 'Ответ уже дан' }
    }

    // Сохраняем ответ
    await db.review.update({
      where: { id: reviewId },
      data: {
        response,
        respondedAt: new Date(),
        respondedById: user.id,
      },
    })

    revalidatePath('/reviews')
    return { success: true }
  } catch (error) {
    console.error('Ошибка ответа на отзыв:', error)
    return { success: false, error: 'Произошла ошибка' }
  }
}

// === Жалоба на отзыв ===

export async function reportReviewAction(data: ReviewReportData): Promise<ReviewActionResult> {
  const parsed = ReviewReportSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const authResult = await requireAuth()
  if (!authResult.success) {
    return { success: false, error: 'Необходимо войти в систему' }
  }

  const { user } = authResult
  const db = getEnhancedPrisma(user)

  try {
    const { reviewId, reason, description } = parsed.data

    // Проверяем отзыв
    const review = await db.review.findUnique({
      where: { id: reviewId },
    })

    if (!review) {
      return { success: false, error: 'Отзыв не найден' }
    }

    // Проверяем, что пользователь не автор отзыва
    if (review.authorId === user.id) {
      return { success: false, error: 'Нельзя пожаловаться на свой отзыв' }
    }

    // Проверяем, что жалоба ещё не подана
    const existingReport = await db.reviewReport.findFirst({
      where: {
        reviewId,
        reporterId: user.id,
      },
    })

    if (existingReport) {
      return { success: false, error: 'Вы уже подали жалобу на этот отзыв' }
    }

    // Создаём жалобу
    await db.reviewReport.create({
      data: {
        reviewId,
        reporterId: user.id,
        reason,
        description,
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Ошибка жалобы на отзыв:', error)
    return { success: false, error: 'Произошла ошибка' }
  }
}
