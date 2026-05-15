import { getEnhancedPrisma } from '@/lib/db'
import type { MetadataRoute } from 'next'

const BASE_URL = 'https://premium.rosstil.ru'

/**
 * Безопасный fetch для sitemap: если БД недоступна или таблица отсутствует,
 * возвращаем пустой массив вместо краха билда.
 * Без этого билд падает на пререндере /sitemap.xml при любых проблемах с БД
 * (например, не применённая миграция).
 */
async function safeFetch<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn()
  } catch (error) {
    console.warn(`[sitemap] failed to fetch ${label}:`, error instanceof Error ? error.message : error)
    return []
  }
}

/** Динамический sitemap для SEO */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getEnhancedPrisma()

  // Загружаем данные параллельно — каждый запрос изолирован от ошибок других
  const [products, categories, sellers, collections] = await Promise.all([
    safeFetch('products', () =>
      db.product.findMany({
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      })),
    safeFetch('categories', () =>
      db.category.findMany({
        select: { id: true, slug: true, updatedAt: true },
      })),
    safeFetch('sellers', () =>
      db.seller.findMany({
        where: { status: 'ACTIVE' },
        select: { slug: true, updatedAt: true },
      })),
    safeFetch('collections', () =>
      db.collection.findMany({
        where: { isPublished: true },
        select: { slug: true, updatedAt: true },
      })),
  ])

  // Статические страницы
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/ru/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/ru/catalog/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/ru/about/`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/ru/contacts/`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/ru/how-to-buy/`,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ]

  // Страницы товаров
  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${BASE_URL}/ru/catalog/${product.id}/`,
    lastModified: product.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  // Страницы категорий
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${BASE_URL}/ru/catalog/?category=${category.slug}`,
    lastModified: category.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Страницы магазинов продавцов
  const sellerPages: MetadataRoute.Sitemap = sellers.map((seller) => ({
    url: `${BASE_URL}/ru/shop/${seller.slug}/`,
    lastModified: seller.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Страницы коллекций
  const collectionPages: MetadataRoute.Sitemap = collections.map((collection) => ({
    url: `${BASE_URL}/ru/collections/${collection.slug}/`,
    lastModified: collection.updatedAt,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...productPages, ...categoryPages, ...sellerPages, ...collectionPages]
}
