import { SITE_URL } from '@/app/_components/json-ld'
import type { MetadataRoute } from 'next'

// Программная генерация robots.txt через Next.js App Router
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/auth/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
