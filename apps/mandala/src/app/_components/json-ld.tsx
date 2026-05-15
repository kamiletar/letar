/**
 * Компонент для вставки JSON-LD структурированных данных (Schema.org)
 */

interface JsonLdProps {
  /** Объект данных Schema.org */
  data: Record<string, unknown>
}

/**
 * Вставляет JSON-LD разметку в head страницы
 * @example
 * <JsonLd data={{
 *   "@context": "https://schema.org",
 *   "@type": "Organization",
 *   "name": "Elfafeya Art"
 * }} />
 */
export function JsonLd({ data }: JsonLdProps) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

/** Базовый URL сайта (из переменной окружения или fallback) */
export const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://mandala.letar.best'

// ===== Schema.org: WebSite =====

/** Схема веб-сайта для улучшения индексации */
export const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  url: SITE_URL,
  name: 'Elfafeya Art',
  description: 'Галерея уникальных мандал и работ художницы Эльфафеи',
  inLanguage: 'ru',
  publisher: {
    '@id': `${SITE_URL}/#organization`,
  },
}

// ===== Schema.org: BreadcrumbList =====

interface BreadcrumbItem {
  /** Название элемента навигации */
  name: string
  /** URL элемента навигации */
  url: string
}

/**
 * Создаёт Schema.org BreadcrumbList для улучшения навигации в поисковой выдаче
 */
export function createBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

// ===== Schema.org: ImageObject =====

interface ImageObjectSchemaProps {
  /** URL изображения */
  contentUrl: string
  /** Название изображения */
  name: string
  /** Описание изображения */
  description: string
  /** Дата публикации */
  datePublished: Date
  /** Дата изменения (опционально) */
  dateModified?: Date | null
}

/**
 * Создаёт Schema.org ImageObject для улучшения индексации изображений
 */
export function createImageObjectSchema(props: ImageObjectSchemaProps) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageObject',
    contentUrl: props.contentUrl,
    name: props.name,
    description: props.description,
    author: { '@type': 'Person', name: 'Эльфафея' },
    creator: { '@type': 'Person', name: 'Эльфафея' },
    copyrightHolder: { '@type': 'Organization', name: 'Elfafeya Art' },
    datePublished: props.datePublished.toISOString(),
    ...(props.dateModified && { dateModified: props.dateModified.toISOString() }),
  }
}

// ===== Schema.org: ItemList =====

interface ItemListItem {
  /** URL элемента списка */
  url: string
  /** Название элемента списка */
  name: string
}

/**
 * Создаёт Schema.org ItemList для улучшения индексации коллекций
 */
export function createItemListSchema(name: string, items: ItemListItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.url,
      name: item.name,
    })),
  }
}

/** Схема организации для корневого layout */
export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Elfafeya Art',
  url: SITE_URL,
  logo: `${SITE_URL}/icons/icon-512.png`,
  description: 'Галерея уникальных мандал и работ художницы Эльфафеи. Точечная роспись, авторские изделия.',
  founder: {
    '@type': 'Person',
    name: 'Эльфафея',
  },
  sameAs: ['https://t.me/elfafeya'],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'elfafeya@gmail.com',
    contactType: 'customer service',
    availableLanguage: 'Russian',
  },
}

/** Схема местного бизнеса для страницы контактов */
export const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  '@id': `${SITE_URL}/#business`,
  name: 'Elfafeya Art',
  description: 'Художница Эльфафея — точечная роспись, мандалы, авторские изделия ручной работы',
  url: SITE_URL,
  logo: `${SITE_URL}/icons/icon-512.png`,
  image: `${SITE_URL}/icons/icon-512.png`,
  email: 'elfafeya@gmail.com',
  priceRange: '₽₽',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'RU',
  },
}

interface ProductSchemaProps {
  /** Название товара */
  name: string
  /** Описание товара */
  description: string
  /** URL изображения */
  imageUrl: string
  /** Цена в рублях (копейки) */
  price: number
  /** Slug товара */
  slug: string
  /** В наличии */
  inStock: boolean
}

/**
 * Генерирует Schema.org Product для страницы товара
 */
export function createProductSchema({ name, description, imageUrl, price, slug, inStock }: ProductSchemaProps) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: imageUrl,
    url: `${SITE_URL}/shop/${slug}`,
    brand: {
      '@type': 'Brand',
      name: 'Elfafeya Art',
    },
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: 'RUB',
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'Elfafeya Art',
      },
    },
  }
}
