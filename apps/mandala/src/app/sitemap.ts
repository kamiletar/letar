import { SITE_URL } from '@/app/_components/json-ld'
import { routing } from '@/i18n/routing'
import { getEnhancedPrisma } from '@/lib/db'
import type { MetadataRoute } from 'next'

/**
 * Генерирует URL с учётом локали.
 * Для дефолтной локали (ru) не добавляет префикс.
 */
function getLocalizedUrl(path: string, locale: string): string {
  if (locale === routing.defaultLocale) {
    return `${SITE_URL}${path}`
  }
  return `${SITE_URL}/${locale}${path}`
}

/**
 * Генерирует alternates для всех локалей.
 */
function getAlternates(path: string): { languages: Record<string, string> } {
  return {
    languages: Object.fromEntries(routing.locales.map((locale) => [locale, getLocalizedUrl(path, locale)])),
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getEnhancedPrisma()

  const mandalas = await db.mandala.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  })

  const products = await db.product.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  })

  const pages = await db.contentPage.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
  })

  const urls: MetadataRoute.Sitemap = []

  // Статические страницы с hreflang alternates
  const staticPages = [
    { path: '/', priority: 1, changeFrequency: 'monthly' as const },
    { path: '/mandalas', priority: 0.9, changeFrequency: 'weekly' as const },
    { path: '/shop', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/contacts', priority: 0.6, changeFrequency: 'yearly' as const },
    { path: '/about-elfafeya', priority: 0.5, changeFrequency: 'yearly' as const },
    { path: '/about-mandalas', priority: 0.5, changeFrequency: 'yearly' as const },
  ]

  // Генерируем URL для каждой локали
  for (const locale of routing.locales) {
    for (const page of staticPages) {
      urls.push({
        url: getLocalizedUrl(page.path, locale),
        lastModified: new Date(),
        changeFrequency: page.changeFrequency,
        priority: page.priority,
        alternates: getAlternates(page.path),
      })
    }

    // Мандалы
    for (const m of mandalas) {
      const path = `/mandalas/${m.slug}`
      urls.push({
        url: getLocalizedUrl(path, locale),
        lastModified: m.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: getAlternates(path),
      })
    }

    // Продукты
    for (const p of products) {
      const path = `/shop/${p.slug}`
      urls.push({
        url: getLocalizedUrl(path, locale),
        lastModified: p.updatedAt,
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: getAlternates(path),
      })
    }

    // Контентные страницы
    for (const p of pages) {
      const path = `/${p.slug}`
      urls.push({
        url: getLocalizedUrl(path, locale),
        lastModified: p.updatedAt,
        changeFrequency: 'yearly',
        priority: 0.5,
        alternates: getAlternates(path),
      })
    }
  }

  return urls
}
