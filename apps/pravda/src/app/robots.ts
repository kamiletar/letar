import type { MetadataRoute } from 'next'

import { BASE_URL } from '@/lib/seo'

export const dynamic = 'force-static'

/**
 * Генерирует robots.txt для поисковых роботов.
 * - Разрешает индексацию всех документов
 * - Запрещает индексацию /search и /bookmarks
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/search', '/bookmarks', '/api/', '/_next/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
