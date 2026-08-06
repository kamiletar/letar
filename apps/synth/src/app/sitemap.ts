import type { MetadataRoute } from 'next'

const PRODUCTION_URL = 'https://synth.letar.best'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  return [
    { url: PRODUCTION_URL, lastModified, changeFrequency: 'monthly', priority: 1 },
    { url: `${PRODUCTION_URL}/gallery`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${PRODUCTION_URL}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
