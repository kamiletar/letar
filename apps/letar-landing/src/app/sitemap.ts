import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://letar.best',
      lastModified: '2026-08-28',
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: 'https://letar.best/privacy/',
      lastModified: '2026-08-28',
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ]
}
