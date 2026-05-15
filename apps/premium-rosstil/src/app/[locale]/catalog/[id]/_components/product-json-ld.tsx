import { getImageUrl } from '@/lib/images/get-image-url'

interface ProductJsonLdProps {
  product: {
    id: string
    name: string
    description?: string | null
    variants: Array<{
      color: string
      composition: string
      items: Array<{
        /** Цена — может быть Decimal из Prisma */
        price: number | { toNumber?: () => number }
        availableCount: number
        size: {
          international: string
        }
      }>
      images: Array<{
        image: { path: string }
      }>
    }>
    seller?: {
      shopName: string
    } | null
  }
  reviewCount?: number
  averageRating?: number
}

/** JSON-LD разметка Product (schema.org) для SEO */
export function ProductJsonLd({ product, reviewCount, averageRating }: ProductJsonLdProps) {
  const allItems = product.variants.flatMap((v) => v.items)
  const prices = allItems.map((item) => (typeof item.price === 'number' ? item.price : Number(item.price)))
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0
  const inStock = allItems.some((item) => item.availableCount > 0)

  // Собираем все изображения
  const images = product.variants
    .flatMap((v) => v.images)
    .map((img) => `https://premium.rosstil.ru${getImageUrl(img.image.path)}`)

  const offers =
    prices.length > 1 && minPrice !== maxPrice
      ? {
          '@type': 'AggregateOffer',
          lowPrice: minPrice,
          highPrice: maxPrice,
          priceCurrency: 'RUB',
          offerCount: allItems.length,
          availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        }
      : {
          '@type': 'Offer',
          price: minPrice,
          priceCurrency: 'RUB',
          availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        }

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || `${product.name} — дизайнерская одежда от Премиум РосСтиль`,
    image: images.length > 0 ? images : undefined,
    brand: {
      '@type': 'Brand',
      name: 'Премиум РосСтиль',
    },
    offers,
    url: `https://premium.rosstil.ru/ru/catalog/${product.id}/`,
  }

  // Продавец
  if (product.seller) {
    jsonLd.seller = {
      '@type': 'Organization',
      name: product.seller.shopName,
    }
  }

  // Рейтинг
  if (reviewCount && reviewCount > 0 && averageRating) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: averageRating,
      reviewCount,
    }
  }

  // JSON.stringify безопасен для JSON-LD — данные из нашей БД, не пользовательский ввод
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}
