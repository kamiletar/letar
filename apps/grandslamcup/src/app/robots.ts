import { isProductionDomain } from '@letar/seo'
import type { MetadataRoute } from 'next'

const PRODUCTION_URL = 'https://grandslamcup.letar.best'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? PRODUCTION_URL

/**
 * Robots.txt — правила индексации для поисковых роботов.
 * На staging/dev индексация закрыта целиком (§33 PLAN-INFRA.md) — гейт по домену через
 * `@letar/seo`, не по `DOMAIN.includes('staging')` (реальный staging-домен содержит
 * подстроку `stage`, не `staging` — старый гейт никогда не срабатывал).
 */
export default function robots(): MetadataRoute.Robots {
  if (!isProductionDomain(PRODUCTION_URL)) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/coach/', '/match/', '/sign-in/', '/profile/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
