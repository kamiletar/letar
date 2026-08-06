import type { MetadataRoute } from 'next'

// Внутренняя панель мониторинга/управления сервером, не публичный контент. Индексация
// закрыта безусловно, независимо от окружения — PLAN-INFRA.md §33.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', disallow: '/' },
  }
}
