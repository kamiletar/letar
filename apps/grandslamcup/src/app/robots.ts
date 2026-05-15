import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://grandslamcup.letar.best'
const DOMAIN = process.env.DOMAIN ?? ''

/** Staging-окружение — запрещаем индексацию полностью */
const isStaging = DOMAIN.includes('test') || DOMAIN.includes('staging')

/** Robots.txt — правила индексации для поисковых роботов */
export default function robots(): MetadataRoute.Robots {
  if (isStaging) {
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
