import type { MetadataRoute } from 'next'

import { ALL_LOCALES, routing } from '@/i18n/routing'
import { BASE_URL } from '@/lib/seo'

export const dynamic = 'force-static'

/**
 * Генерация sitemap для всех 10 локалей.
 * Главная страница — одна, но с локализованными альтернативами.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  // hreflang alternates — все 10 локалей
  const languages: Record<string, string> = {}
  for (const loc of ALL_LOCALES) {
    languages[loc] = loc === routing.defaultLocale ? BASE_URL : `${BASE_URL}/${loc}`
  }

  return ALL_LOCALES.map((locale) => ({
    url: locale === routing.defaultLocale ? BASE_URL : `${BASE_URL}/${locale}`,
    lastModified,
    changeFrequency: 'weekly' as const,
    priority: locale === routing.defaultLocale ? 1 : 0.8,
    alternates: {
      languages,
    },
  }))
}
