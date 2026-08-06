import { ALL_LOCALES } from '@/i18n/routing'
import type { MetadataRoute } from 'next'

/**
 * Публичные страницы, не за авторизацией: главная и privacy. Кабинет (/profile), вход
 * (/sign-in), отписка (/unsubscribe) — не контент, исключены (см. robots.ts).
 * `localePrefix: 'as-needed'` — у ru нет префикса, остальные локали идут через `/<locale>/`.
 */
const PUBLIC_PATHS = [
  { path: '', priority: 1 },
  { path: '/privacy', priority: 0.3 },
] as const

const PRODUCTION_URL = 'https://time.letar.best'

function pathFor(locale: string, path: string): string {
  return locale === 'ru' ? `${PRODUCTION_URL}${path || '/'}` : `${PRODUCTION_URL}/${locale}${path}`
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return PUBLIC_PATHS.flatMap(({ path, priority }) => {
    const languages = Object.fromEntries(ALL_LOCALES.map((locale) => [locale, pathFor(locale, path)]))

    return ALL_LOCALES.map((locale) => ({
      url: pathFor(locale, path),
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: locale === 'ru' ? priority : priority * 0.9,
      alternates: { languages },
    }))
  })
}
