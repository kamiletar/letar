'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { prisma } from '@/lib/prisma'
import { z } from 'zod/v4'

/**
 * Схема валидации комментария
 */
const CommentSchema = z
  .object({
    postSlug: z.string().min(1),
    content: z.string().min(3, 'Минимум 3 символа').max(2000, 'Максимум 2000 символов'),
    parentId: z.string().optional(),
  })
  .strip()

/**
 * Добавить комментарий к статье
 */
export async function addCommentAction(data: z.infer<typeof CommentSchema>) {
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  const parsed = CommentSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'VALIDATION_ERROR', details: parsed.error.flatten() }
  }

  try {
    // Используем enhanced prisma с access control для авторизованных операций
    const db = getEnhancedPrisma(session.user)

    const comment = await db.blogComment.create({
      data: {
        postSlug: parsed.data.postSlug,
        content: parsed.data.content,
        parentId: parsed.data.parentId || null,
        userId: session.user.id,
        isApproved: true, // Авто-одобрение для авторизованных пользователей
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    })

    return { success: true, comment }
  } catch (error) {
    console.error('[Comments] Failed to add comment:', error)
    return { success: false, error: 'SERVER_ERROR' }
  }
}

/**
 * Удалить свой комментарий
 */
export async function deleteCommentAction(commentId: string) {
  const session = await getSession()

  if (!session?.user?.id) {
    return { success: false, error: 'UNAUTHORIZED' }
  }

  try {
    const db = getEnhancedPrisma(session.user)

    // Проверяем что комментарий принадлежит пользователю
    const comment = await db.blogComment.findUnique({
      where: { id: commentId },
      select: { userId: true },
    })

    if (!comment) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем права (автор или админ)
    const isAdmin = session.user.roles?.includes('ADMIN')
    if (comment.userId !== session.user.id && !isAdmin) {
      return { success: false, error: 'FORBIDDEN' }
    }

    await db.blogComment.delete({
      where: { id: commentId },
    })

    return { success: true }
  } catch (error) {
    console.error('[Comments] Failed to delete comment:', error)
    return { success: false, error: 'SERVER_ERROR' }
  }
}

/**
 * Получить комментарии к статье (публичный доступ)
 */
export async function getCommentsAction(postSlug: string) {
  try {
    // Публичный запрос — используем prisma без access control
    const comments = await prisma.blogComment.findMany({
      where: {
        postSlug,
        isApproved: true,
        isSpam: false,
        parentId: null, // Только корневые комментарии
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replies: {
          where: {
            isApproved: true,
            isSpam: false,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, comments }
  } catch (error) {
    console.error('[Comments] Failed to get comments:', error)
    return { success: false, error: 'SERVER_ERROR', comments: [] }
  }
}
