import type { MetadataRoute } from 'next'

/**
 * Генерация robots.txt для SEO
 * Разрешаем индексацию всего сайта
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://animatrona.letar.best'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
