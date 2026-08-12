import type { MetadataRoute } from 'next'

// Каталог/плеер — решение владельца (PLAN-INFRA.md §33): всё приложение за
// авторизацией, публичная индексация не задумана. Disallow безусловный, не
// только на staging.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  }
}
