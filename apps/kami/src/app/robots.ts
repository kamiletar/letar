import { isProductionDomain } from '@letar/seo'
import type { MetadataRoute } from 'next'

const PRODUCTION_URL = 'https://kami.letar.best'

/** На staging/dev индексация закрыта целиком (§33 PLAN-INFRA.md). */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || PRODUCTION_URL

  if (!isProductionDomain(PRODUCTION_URL)) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/_next/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
