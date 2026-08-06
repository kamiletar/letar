import { isProductionDomain } from '@letar/seo'
import type { MetadataRoute } from 'next'

const PRODUCTION_URL = 'https://forms.letar.best'

// sitemap.ts не заведён (PLAN-INFRA.md §33) — страницы документации приходят из Fumadocs
// source API, а не из статического списка путей; нужно отдельное исследование его page tree.
export default function robots(): MetadataRoute.Robots {
  if (!isProductionDomain(PRODUCTION_URL)) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }

  return {
    rules: { userAgent: '*', allow: '/' },
  }
}
