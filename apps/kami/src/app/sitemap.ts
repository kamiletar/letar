import { prisma } from '@/lib/db'
import { reader } from '@/lib/keystatic'
import type { MetadataRoute } from 'next'

/** Генерация sitemap с динамическими роутами (blog, audio) */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://kami.letar.best'
  const locales = ['ru', 'en']

  // Статические страницы
  const staticPages = [
    '',
    'about',
    'skills',
    'projects',
    'hire',
    'blog',
    'cv',
    'learning',
    'consulting',
    'audio',
    'privacy',
    'terms',
  ]

  const routes: MetadataRoute.Sitemap = []

  // Статические страницы для обеих локалей
  for (const locale of locales) {
    for (const page of staticPages) {
      const path = page ? `${page}/` : ''
      routes.push({
        url: `${baseUrl}/${locale}/${path}`,
        lastModified: new Date(),
        changeFrequency: page === '' ? 'weekly' : 'monthly',
        priority: page === '' ? 1 : page === 'blog' ? 0.9 : 0.8,
        alternates: {
          languages: {
            ru: `${baseUrl}/ru/${path}`,
            en: `${baseUrl}/en/${path}`,
          },
        },
      })
    }
  }

  // Динамические: посты блога (Keystatic)
  try {
    const posts = await reader.collections.posts.all()
    for (const post of posts) {
      for (const locale of locales) {
        routes.push({
          url: `${baseUrl}/${locale}/blog/${post.slug}/`,
          lastModified: post.entry.publishedAt ? new Date(post.entry.publishedAt) : new Date(),
          changeFrequency: 'monthly',
          priority: 0.7,
          alternates: {
            languages: {
              ru: `${baseUrl}/ru/blog/${post.slug}/`,
              en: `${baseUrl}/en/blog/${post.slug}/`,
            },
          },
        })
      }
    }
  } catch {
    // Keystatic может быть недоступен при билде
  }

  // Динамические: аудиозаписи (Prisma)
  try {
    const audioFiles = await prisma.audioFile.findMany({
      select: { slug: true, uploadedAt: true },
      where: { slug: { not: undefined } },
    })
    for (const audio of audioFiles) {
      if (!audio.slug) {
        continue
      }
      for (const locale of locales) {
        routes.push({
          url: `${baseUrl}/${locale}/audio/${audio.slug}/`,
          lastModified: audio.uploadedAt,
          changeFrequency: 'yearly',
          priority: 0.6,
          alternates: {
            languages: {
              ru: `${baseUrl}/ru/audio/${audio.slug}/`,
              en: `${baseUrl}/en/audio/${audio.slug}/`,
            },
          },
        })
      }
    }
  } catch {
    // БД может быть недоступна при билде
  }

  return routes
}
