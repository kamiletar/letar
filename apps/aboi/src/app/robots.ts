import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://neyroaboi.ru'
// На staging (aboi.letar.best) и в dev — закрываем индексацию полностью
const IS_PRODUCTION_DOMAIN = BASE_URL === 'https://neyroaboi.ru'

export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION_DOMAIN) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/profile/', '/cart', '/checkout', '/sign-', '/api/'],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
