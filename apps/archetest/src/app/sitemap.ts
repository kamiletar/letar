import type { MetadataRoute } from 'next'

/**
 * Карта сайта для публичных страниц обеих локалей.
 *
 * Кабинет и настройки не входят — они за авторизацией. Dev-роуты не входят —
 * их нет в production-сборке вовсе (см. `[locale]/dev/layout.tsx`).
 *
 * `hreflang` через `alternates.languages`: RU — корневой путь, EN — префикс
 * `/en`. Без этого поисковик считает переводы дублями друг друга.
 */
const PUBLIC_PATHS = [
  { path: '', priority: 1 },
  { path: '/express', priority: 0.9 },
  { path: '/for-professionals', priority: 0.8 },
  { path: '/privacy', priority: 0.3 },
] as const

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!baseUrl) {
    // Без базового URL абсолютные ссылки построить нельзя, а относительные
    // в sitemap невалидны — честнее отдать пустую карту, чем битую
    return []
  }

  const lastModified = new Date()

  return PUBLIC_PATHS.flatMap(({ path, priority }) => [
    {
      url: `${baseUrl}${path || '/'}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority,
      alternates: {
        languages: {
          ru: `${baseUrl}${path || '/'}`,
          en: `${baseUrl}/en${path}`,
        },
      },
    },
    {
      url: `${baseUrl}/en${path}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: priority * 0.9,
      alternates: {
        languages: {
          ru: `${baseUrl}${path || '/'}`,
          en: `${baseUrl}/en${path}`,
        },
      },
    },
  ])
}
