'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { reader } from '@/lib/keystatic'
import { publishToFacebook } from '@/lib/social/facebook'
import { publishToTelegram } from '@/lib/social/telegram'
import type { FacebookConfig, TelegramConfig, VKConfig } from '@/lib/social/types'
import { publishToVK } from '@/lib/social/vk'
import { revalidatePath } from 'next/cache'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'

/** Получить данные блог-поста из Keystatic */
async function getBlogPostData(slug: string) {
  const post = await reader.collections.posts.read(slug)
  if (!post) {
    return null
  }

  return {
    slug,
    title: post.title,
    description: post.description,
    tags: [...(post.tags || [])],
    url: `${SITE_URL}/ru/blog/${slug}/`,
  }
}

/** Опубликовать пост на выбранные платформы */
export async function publishPost(postSlug: string, platformIds: string[]) {
  const session = await getSession()
  if (!session?.user) {
    return { error: 'Не авторизован' }
  }

  const db = getEnhancedPrisma(session.user)

  // Получаем данные поста
  const post = await getBlogPostData(postSlug)
  if (!post) {
    return { error: 'Пост не найден' }
  }

  // Получаем платформы
  const platforms = await db.socialPlatform.findMany({
    where: { id: { in: platformIds }, enabled: true },
  })

  if (platforms.length === 0) {
    return { error: 'Нет доступных платформ' }
  }

  const results: Array<{ platformId: string; success: boolean; error?: string }> = []

  for (const platform of platforms) {
    // Создаём запись CrossPost со статусом PENDING
    const crossPost = await db.crossPost.upsert({
      where: { postSlug_platformId: { postSlug, platformId: platform.id } },
      create: { postSlug, platformId: platform.id, status: 'PENDING' },
      update: { status: 'PENDING', error: null, externalId: null, externalUrl: null, publishedAt: null },
    })

    // Публикуем в зависимости от типа платформы
    const config = platform.config as Record<string, unknown>
    let result

    switch (platform.type) {
      case 'TELEGRAM':
        result = await publishToTelegram(config as unknown as TelegramConfig, post)
        break
      case 'VK':
        result = await publishToVK(config as unknown as VKConfig, post)
        break
      case 'FACEBOOK':
        result = await publishToFacebook(config as unknown as FacebookConfig, post)
        break
      default:
        result = { success: false, error: `Платформа ${platform.type} пока не поддерживается` }
    }

    // Обновляем статус CrossPost
    await db.crossPost.update({
      where: { id: crossPost.id },
      data: {
        status: result.success ? 'PUBLISHED' : 'FAILED',
        externalId: result.externalId,
        externalUrl: result.externalUrl,
        error: result.error,
        publishedAt: result.success ? new Date() : null,
      },
    })

    results.push({ platformId: platform.id, success: result.success, error: result.error })
  }

  revalidatePath('/admin/social/logs')
  return { success: true, results }
}

/** Повторить неудавшуюся публикацию */
export async function retryPost(crossPostId: string) {
  const session = await getSession()
  if (!session?.user) {
    return { error: 'Не авторизован' }
  }

  const db = getEnhancedPrisma(session.user)

  const crossPost = await db.crossPost.findUnique({
    where: { id: crossPostId },
    include: { platform: true },
  })

  if (!crossPost) {
    return { error: 'Запись не найдена' }
  }
  if (crossPost.status !== 'FAILED') {
    return { error: 'Повтор возможен только для FAILED записей' }
  }

  return publishPost(crossPost.postSlug, [crossPost.platformId])
}

/** Получить статусы публикаций поста */
export async function getPostPublications(postSlug: string) {
  const session = await getSession()
  if (!session?.user) {
    return []
  }

  const db = getEnhancedPrisma(session.user)

  return db.crossPost.findMany({
    where: { postSlug },
    select: {
      id: true,
      status: true,
      externalUrl: true,
      platform: { select: { id: true, type: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

/** Получить все включённые платформы */
export async function getEnabledPlatforms() {
  const session = await getSession()
  if (!session?.user) {
    return []
  }

  const db = getEnhancedPrisma(session.user)

  return db.socialPlatform.findMany({
    where: { enabled: true },
    select: { id: true, type: true, name: true },
  })
}
