interface ProductForJsonLd {
  slug: string
  name: string
  description?: string | null
  pricePerMeter: number
  imageUrls: string[]
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'https://neyroaboi.ru'
}

/**
 * JSON-LD для карточки товара (Schema.org Product + Offer).
 * Цена приводится к рублям из копеек, валюта RUB.
 */
export function productJsonLd(product: ProductForJsonLd): Record<string, unknown> {
  const BASE_URL = getBaseUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description ?? undefined,
    image: product.imageUrls.length > 0 ? product.imageUrls : undefined,
    url: `${BASE_URL}/catalog/${product.slug}/`,
    brand: {
      '@type': 'Brand',
      name: 'НейроАбоИ',
    },
    offers: {
      '@type': 'Offer',
      url: `${BASE_URL}/catalog/${product.slug}/`,
      priceCurrency: 'RUB',
      price: (product.pricePerMeter / 100).toFixed(2),
      availability: 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  }
}

/**
 * BreadcrumbList JSON-LD для навигации поисковиков.
 */
export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): Record<string, unknown> {
  const BASE_URL = getBaseUrl()
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: `${BASE_URL}${item.path}`,
    })),
  }
}

/**
 * Organization JSON-LD для главной — ИП Гаев В.В., продаёт декоративные обои.
 */
export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'НейроАбоИ',
    url: getBaseUrl(),
    description: 'Декоративные обои с зашитыми аффирмациями. Печать под заказ на флизелине.',
  }
}
