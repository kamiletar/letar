import type { MetadataRoute } from 'next'

const PRODUCTION_URL = 'https://kamikeythe.letar.best'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: PRODUCTION_URL, changeFrequency: 'monthly', priority: 1 },
    { url: `${PRODUCTION_URL}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
