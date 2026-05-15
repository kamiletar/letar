import type { MetadataRoute } from 'next'

/** Robots.txt для SEO */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/seller/', '/profile/', '/auth/', '/cart/', '/checkout/'],
      },
    ],
    sitemap: 'https://premium.rosstil.ru/sitemap.xml',
  }
}
