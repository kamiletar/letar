import { isProductionDomain } from '@letar/seo'
import type { MetadataRoute } from 'next'

const PRODUCTION_URL = 'https://time.letar.best'

export default function robots(): MetadataRoute.Robots {
  // На staging (time-stage.s3.letar.best) и в dev — закрываем индексацию полностью
  if (!isProductionDomain(PRODUCTION_URL)) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Персональные страницы — не контент, индексировать нечего
      disallow: ['/profile', '/sign-in', '/unsubscribe', '/api/'],
    },
    sitemap: `${PRODUCTION_URL}/sitemap.xml`,
  }
}
