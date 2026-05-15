/**
 * JSON-LD структурированные данные для SEO.
 * Реализует schema.org разметку для поисковых систем.
 */

import { BASE_URL, SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo'

/**
 * JSON-LD разметка WebSite с SearchAction.
 * Используется на главной странице.
 */
export function WebSiteJsonLd() {
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: BASE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: 'ru-RU',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }} />
}

interface ArticleJsonLdProps {
  title: string
  description: string
  href: string
  category: string
}

/**
 * JSON-LD разметка Article.
 * Используется для страниц документов.
 */
export function ArticleJsonLd({ title, description, href, category }: ArticleJsonLdProps) {
  const article = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: `${BASE_URL}${href}`,
    articleSection: category,
    inLanguage: 'ru-RU',
    publisher: {
      '@type': 'Organization',
      name: 'Pravda',
      url: BASE_URL,
    },
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: BASE_URL,
    },
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(article) }} />
}

interface Breadcrumb {
  title: string
  href: string
}

interface BreadcrumbJsonLdProps {
  items: Breadcrumb[]
}

/**
 * JSON-LD разметка BreadcrumbList.
 * Используется на всех страницах с хлебными крошками.
 */
export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.title,
      item: `${BASE_URL}${item.href}`,
    })),
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbList) }} />
}

/** Маппинг категорий на URL и названия */
const CATEGORY_MAP: Record<string, { href: string; title: string }> = {
  Кодексы: { href: '/codes', title: 'Кодексы' },
  Уставы: { href: '/statutes', title: 'Уставы' },
  Регламенты: { href: '/regulations', title: 'Регламенты' },
}

interface DocumentBreadcrumbJsonLdProps {
  title: string
  href: string
  category: string
}

/**
 * JSON-LD разметка BreadcrumbList для документа.
 * Автоматически строит хлебные крошки: Главная → Категория → Документ
 */
export function DocumentBreadcrumbJsonLd({ title, href, category }: DocumentBreadcrumbJsonLdProps) {
  const items: Breadcrumb[] = [{ title: 'Главная', href: '/' }]

  // Добавляем категорию если есть
  const categoryInfo = CATEGORY_MAP[category]
  if (categoryInfo) {
    items.push(categoryInfo)
  }

  // Добавляем сам документ
  items.push({ title, href })

  return <BreadcrumbJsonLd items={items} />
}
