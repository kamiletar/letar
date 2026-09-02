import { SITE_URL } from '@/app/_components/json-ld'
import { isProductionDomain } from '@letar/seo'
import type { MetadataRoute } from 'next'

const PRODUCTION_URL = 'https://mandala.letar.best'

// Программная генерация robots.txt через Next.js App Router.
// На staging/dev индексация закрыта целиком (§33 PLAN-INFRA.md).
export default function robots(): MetadataRoute.Robots {
  if (!isProductionDomain(PRODUCTION_URL)) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/auth/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
