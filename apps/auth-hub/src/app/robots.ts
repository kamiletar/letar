import type { MetadataRoute } from 'next'

// Ключница — хаб авторизации, не публичный контент. Индексация закрыта безусловно,
// независимо от окружения (не только staging) — PLAN-INFRA.md §33.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  }
}
