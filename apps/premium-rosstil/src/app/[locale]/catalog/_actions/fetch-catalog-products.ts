'use server'

import type { Gender } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/get-image-url'
import { buildCatalogWhere, type CatalogFilterParams } from '../_lib/build-catalog-where'

const ITEMS_PER_PAGE = 12

/** Сериализованный продукт для клиентского компонента */
export interface CatalogProduct {
  id: string
  name: string
  description: string | null
  gender: string
  isNewCollection: boolean
  sortOrder: number
  categoryId: string | null
  seller: { shopName: string; slug: string } | null
  variants: Array<{
    id: string
    color: string
    colorRef: { id: string; name: string; slug: string; hex: string } | null
    items: Array<{
      id: string
      price: number
      stock: number
      size: { id: string; ru: string | null; international: string | null } | null
    }>
    images: Array<{
      id: string
      url: string
      alt: string | null
    }>
  }>
}

export interface CatalogProductsResult {
  products: CatalogProduct[]
  totalCount: number
  totalPages: number
  currentPage: number
  wishlistVariantIds: string[]
}

interface FetchParams extends CatalogFilterParams {
  sort?: string
  page?: number
}

/** Получает товары каталога с фильтрацией, сортировкой и пагинацией */
export async function fetchCatalogProducts(params: FetchParams): Promise<CatalogProductsResult> {
  const session = await getSession()
  const db = getEnhancedPrisma(session?.user)

  const where = buildCatalogWhere(params)

  const page = params.page ?? 1
  const sort = params.sort

  // Определяем сортировку
  const shouldSortByPrice = sort === 'price_asc' || sort === 'price_desc'
  const orderBy = sort === 'newest' ? { createdAt: 'desc' as const } : { sortOrder: 'asc' as const }

  // Общее количество
  const totalCount = await db.product.count({ where: where as never })
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)
  const currentPage = Math.max(1, Math.min(page, totalPages || 1))

  // Получаем продукты с вложенными данными
  const products = (await db.product.findMany({
    where: where as never,
    include: {
      seller: { select: { shopName: true, slug: true } },
      variants: {
        include: {
          colorRef: { select: { id: true, name: true, slug: true, hex: true } },
          items: { orderBy: { price: 'asc' } },
          images: {
            include: { image: true },
            orderBy: { order: 'asc' },
            take: 1,
          },
        },
      },
    },
    orderBy: shouldSortByPrice ? undefined : orderBy,
    skip: shouldSortByPrice ? undefined : (currentPage - 1) * ITEMS_PER_PAGE,
    take: shouldSortByPrice ? undefined : ITEMS_PER_PAGE,
  })) as unknown as Array<{
    id: string
    name: string
    description: string | null
    gender: Gender
    isNewCollection: boolean
    sortOrder: number
    categoryId: string | null
    seller: { shopName: string; slug: string } | null
    variants: Array<{
      id: string
      color: string
      colorRef: { id: string; name: string; slug: string; hex: string } | null
      items: Array<{
        id: string
        price: unknown
        stock: number
        size: { id: string; ru: string | null; international: string | null } | null
      }>
      images: Array<{ id: string; image: { path: string }; alt: string | null }>
    }>
  }>

  // Wishlist пользователя
  let wishlistVariantIds: string[] = []
  if (session?.user) {
    const wishlist = await db.wishlist.findUnique({
      where: { userId: session.user.id },
      include: { items: { select: { productVariantId: true } } },
    })
    wishlistVariantIds = wishlist?.items.map((i) => i.productVariantId) ?? []
  }

  // Сериализация (Decimal → number, image path → url)
  let serialized: CatalogProduct[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    gender: product.gender,
    isNewCollection: product.isNewCollection,
    sortOrder: product.sortOrder,
    categoryId: product.categoryId,
    seller: product.seller,
    variants: product.variants.map((v) => ({
      id: v.id,
      color: v.color,
      colorRef: v.colorRef,
      items: v.items.map((i) => ({
        id: i.id,
        price: Number(i.price),
        stock: i.stock,
        size: i.size,
      })),
      images: v.images.map((vi) => ({
        id: vi.id,
        url: getImageUrl(vi.image.path),
        alt: vi.alt,
      })),
    })),
  }))

  // Сортировка по цене на стороне сервера
  if (shouldSortByPrice) {
    serialized.sort((a, b) => {
      const aMin = Math.min(...a.variants.flatMap((v) => v.items.map((i) => i.price)))
      const bMin = Math.min(...b.variants.flatMap((v) => v.items.map((i) => i.price)))
      return sort === 'price_asc' ? aMin - bMin : bMin - aMin
    })
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    serialized = serialized.slice(start, start + ITEMS_PER_PAGE)
  }

  return {
    products: serialized,
    totalCount,
    totalPages,
    currentPage,
    wishlistVariantIds,
  }
}
