import type { MetadataRoute } from 'next'

// Песочница для разработки/тестирования @letar/forms, не публичный продукт. Индексация
// закрыта безусловно, независимо от окружения — PLAN-INFRA.md §33.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  }
}
