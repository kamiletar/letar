'use server'

/**
 * Server actions для управления новостями
 */

import { adminGuard } from '@/lib/action-guard'
import { prisma } from '@/lib/db'
import { requireAdminAction } from '@/lib/roles'
import { revalidatePath } from 'next/cache'
import { z } from 'zod/v4'

const NewsSchema = z
  .object({
    title: z.string().min(1, 'Введите заголовок').max(500),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'Только латиница, цифры и дефис'),
    content: z.string().min(1, 'Введите контент'),
    excerpt: z.string().max(500).optional(),
    coverImage: z.string().optional(),
    matchId: z.string().optional(),
    cityId: z.string().optional(),
    published: z.boolean().default(false),
  })
  .strip()

export const getNewsAction = adminGuard(async () => {
  try {
    const posts = await prisma.newsPost.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true } },
        city: { select: { id: true, name: true } },
        match: {
          select: {
            id: true,
            homeTeam: { select: { team: { select: { name: true } } } },
            awayTeam: { select: { team: { select: { name: true } } } },
          },
        },
      },
    })

    return { data: posts }
  } catch (error) {
    console.error('[getNewsAction] ошибка:', error)
    return { success: false as const, error: 'Не удалось загрузить новости' }
  }
})

export const getNewsPostAction = adminGuard(async (id: string) => {
  try {
    const post = await prisma.newsPost.findUnique({ where: { id } })
    return post ? { success: true as const, data: post } : { success: false as const, error: 'Новость не найдена' }
  } catch (error) {
    console.error('[getNewsPostAction] ошибка:', error)
    return { success: false as const, error: 'Не удалось загрузить новость' }
  }
})

export async function createNewsAction(formData: unknown) {
  const auth = await requireAdminAction()
  if (!auth.success) {
    return { error: auth.error }
  }

  const parsed = NewsSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  try {
    const post = await prisma.newsPost.create({
      data: {
        ...parsed.data,
        matchId: parsed.data.matchId || null,
        coverImage: parsed.data.coverImage || null,
        excerpt: parsed.data.excerpt || null,
        cityId: parsed.data.cityId || null,
        authorId: auth.user.id,
        publishedAt: parsed.data.published ? new Date() : null,
      },
    })

    revalidatePath('/admin/news')
    revalidatePath('/news')
    return { success: true, data: { id: post.id } }
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('Unique')) {
      return { error: 'Новость с таким slug уже существует' }
    }
    return { error: 'Ошибка создания' }
  }
}

export const updateNewsAction = adminGuard(async (id: string, formData: unknown) => {
  const parsed = NewsSchema.safeParse(formData)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' }
  }

  try {
    const existing = await prisma.newsPost.findUnique({ where: { id } })
    if (!existing) {
      return { error: 'Новость не найдена' }
    }

    await prisma.newsPost.update({
      where: { id },
      data: {
        ...parsed.data,
        matchId: parsed.data.matchId || null,
        coverImage: parsed.data.coverImage || null,
        excerpt: parsed.data.excerpt || null,
        cityId: parsed.data.cityId || null,
        publishedAt: parsed.data.published && !existing.publishedAt ? new Date() : existing.publishedAt,
      },
    })

    revalidatePath('/admin/news')
    revalidatePath('/news')
    revalidatePath(`/news/${parsed.data.slug}`)
    return { success: true }
  } catch (error) {
    console.error('[updateNewsAction] ошибка:', error)
    return { error: 'Не удалось обновить новость' }
  }
})

export const deleteNewsAction = adminGuard(async (id: string) => {
  try {
    const post = await prisma.newsPost.findUnique({ where: { id }, select: { slug: true } })
    if (!post) {
      return { error: 'Новость не найдена' }
    }

    await prisma.newsPost.delete({ where: { id } })

    revalidatePath('/admin/news')
    revalidatePath('/news')
    return { success: true }
  } catch (error) {
    console.error('[deleteNewsAction] ошибка:', error)
    return { error: 'Не удалось удалить новость' }
  }
})
