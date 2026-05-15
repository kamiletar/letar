import type { Gender } from '@/generated/prisma'
import { getImageUrl } from '@/lib/images/get-image-url'

/** Тип изображения из БД */
interface DbImage {
  path: string
}

/** Тип связи вариант-изображение из БД */
interface VariantImageDb {
  id: string
  image: DbImage
  alt: string | null
}

/** Тип item (размер/цена) из БД */
interface ProductItemDb {
  id: string
  price: unknown // Prisma Decimal
  availableCount: number
}

/** Тип варианта продукта из БД */
interface ProductVariantDb {
  id: string
  color: string
  colorRef?: { id: string; name: string; slug: string; hex: string } | null
  items: ProductItemDb[]
  images: VariantImageDb[]
}

/** Тип продукта с вариантами из БД */
interface ProductWithVariantsDb {
  id: string
  name: string
  averageRating?: number | null
  reviewCount?: number
  seller?: { shopName: string; slug: string } | null
  variants: ProductVariantDb[]
}

/** Сериализованный продукт для ProductCard */
export interface SerializedProduct {
  id: string
  name: string
  averageRating?: number | null
  reviewCount?: number
  seller?: { shopName: string; slug: string } | null
  variants: Array<{
    id: string
    color: string
    colorRef?: { id: string; name: string; slug: string; hex: string } | null
    items: Array<{ price: number }>
    images: Array<{ id: string; url: string; alt: string | null }>
  }>
}

/** Стандартный include для запросов рекомендаций */
const recommendationInclude = {
  seller: {
    select: { shopName: true, slug: true },
  },
  variants: {
    include: {
      colorRef: true,
      items: {
        orderBy: { price: 'asc' as const },
      },
      images: {
        include: { image: true },
        orderBy: { order: 'asc' as const },
        take: 1,
      },
    },
  },
} as const

/** Сериализует продукт из БД для передачи в ProductCard */
function serializeProduct(product: ProductWithVariantsDb): SerializedProduct {
  return {
    ...product,
    variants: product.variants.map((variant: ProductVariantDb) => ({
      ...variant,
      items: variant.items.map((item: ProductItemDb) => ({
        ...item,
        price: Number(item.price),
      })),
      images: variant.images.map((vi: VariantImageDb) => ({
        id: vi.id,
        url: getImageUrl(vi.image.path),
        alt: vi.alt,
      })),
    })),
  }
}

/** Параметры для загрузки рекомендаций */
interface RecommendationOptions {
  /** ID товаров для исключения */
  excludeIds: string[]
  /** Фильтр по категории */
  categoryId?: string | null
  /** Фильтр по полу */
  gender?: Gender
  /** Максимальное количество */
  limit: number
}

type DbClient = { product: any; wishlist: any }

/**
 * Загружает рекомендованные товары с fallback-стратегией.
 * Сначала ищет по categoryId + gender, если мало — добить только по gender.
 */
export async function getRecommendedProducts(db: DbClient, opts: RecommendationOptions): Promise<SerializedProduct[]> {
  const { excludeIds, categoryId, gender, limit } = opts

  // Базовый where: исключаем товары и только доступные
  const baseWhere = {
    id: { notIn: excludeIds },
    variants: {
      some: {
        items: {
          some: { availableCount: { gt: 0 } },
        },
      },
    },
  }

  // Первый запрос: категория + пол (если указаны)
  const primaryWhere = {
    ...baseWhere,
    ...(categoryId ? { categoryId } : {}),
    ...(gender ? { gender } : {}),
  }

  const products: ProductWithVariantsDb[] = await db.product.findMany({
    where: primaryWhere,
    take: limit,
    orderBy: [{ averageRating: 'desc' }, { createdAt: 'desc' }],
    include: recommendationInclude,
  })

  // Fallback: если результатов мало и был фильтр по категории — добить по полу
  if (products.length < limit && categoryId) {
    const existingIds = [...excludeIds, ...products.map((p: ProductWithVariantsDb) => p.id)]
    const remaining = limit - products.length

    const fallbackWhere = {
      ...baseWhere,
      id: { notIn: existingIds },
      ...(gender ? { gender } : {}),
    }

    const fallbackProducts: ProductWithVariantsDb[] = await db.product.findMany({
      where: fallbackWhere,
      take: remaining,
      orderBy: [{ averageRating: 'desc' }, { createdAt: 'desc' }],
      include: recommendationInclude,
    })

    products.push(...fallbackProducts)
  }

  return products.map(serializeProduct)
}

/**
 * Загружает ID вариантов в wishlist пользователя.
 */
export async function getWishlistVariantIds(db: DbClient, userId: string): Promise<string[]> {
  const wishlist = await db.wishlist.findUnique({
    where: { userId },
    include: {
      items: {
        select: { productVariantId: true },
      },
    },
  })

  return wishlist?.items.map((item: { productVariantId: string }) => item.productVariantId) || []
}
