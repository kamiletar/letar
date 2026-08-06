import { isProductionDomain } from '@letar/seo'
import type { MetadataRoute } from 'next'

const PRODUCTION_URL = 'https://synth.letar.best'

export default function robots(): MetadataRoute.Robots {
  // На staging и в dev — закрываем индексацию полностью (PLAN-INFRA.md §33)
  if (!isProductionDomain(PRODUCTION_URL)) {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }

  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${PRODUCTION_URL}/sitemap.xml`,
  }
}
