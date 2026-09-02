import type { MetadataRoute } from 'next'

import { BASE_URL, isProductionDomain } from '@/lib/seo'

export const dynamic = 'force-static'

/**
 * Генерирует robots.txt для поисковых роботов.
 * На staging/dev закрывает индексацию целиком (§33 PLAN-INFRA.md).
 */
export default function robots(): MetadataRoute.Robots {
  if (!isProductionDomain()) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
