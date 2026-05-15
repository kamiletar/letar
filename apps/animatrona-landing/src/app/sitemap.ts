import type { MetadataRoute } from 'next'

/**
 * Генерация sitemap для SEO
 * Фиксированная дата для стабильного кэширования
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://animatrona.letar.best'

  return [
    {
      url: baseUrl,
      lastModified: new Date('2026-01-17'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified: new Date('2026-01-17'),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/docs/quick-start`,
      lastModified: new Date('2026-01-17'),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/docs/keyboard-shortcuts`,
      lastModified: new Date('2026-01-17'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/docs/encoding-profiles`,
      lastModified: new Date('2026-01-17'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/docs/troubleshooting`,
      lastModified: new Date('2026-01-17'),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]
}
