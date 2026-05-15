import type { MetadataRoute } from 'next'

import { documents } from '@/lib/documents'
import { BASE_URL } from '@/lib/seo'

export const dynamic = 'force-static'

/**
 * Генерирует sitemap.xml для поисковых систем.
 * Включает главную страницу, категории и все 22 документа.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  // Страницы документов из реестра
  const documentPages: MetadataRoute.Sitemap = documents.map((doc) => ({
    url: `${BASE_URL}${doc.href}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: doc.category === 'Основные законы' ? 0.9 : 0.8,
  }))

  return [
    // Главная страница
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    // Страницы категорий
    {
      url: `${BASE_URL}/codes`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/statutes`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/regulations`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    // Все документы
    ...documentPages,
  ]
}
