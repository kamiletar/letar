'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getImageUrl } from '@/lib/images/get-image-url'
import type { SerializedProduct } from '@/lib/recommendation-utils'

/**
 * Загружает товары по массиву ID с сериализацией для ProductCard.
 * Возвращает wishlistVariantIds для авторизованных пользователей.
 */
export async function getProductsByIds(ids: string[]): Promise<{
  products: SerializedProduct[]
  wishlistVariantIds: string[]
  isAuthenticated: boolean
}> {
  if (ids.length === 0) {
    return { products: [], wishlistVariantIds: [], isAuthenticated: false }
  }

  const session = await getSession()
  const db = getEnhancedPrisma(session?.user)

  const products = await db.product.findMany({
    where: { id: { in: ids } },
    include: {
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
    },
  })

  const serialized: SerializedProduct[] = products.map((product) => ({
    ...product,
    variants: product.variants.map((variant: (typeof product.variants)[number]) => ({
      ...variant,
      items: variant.items.map((item: (typeof variant.items)[number]) => ({
        ...item,
        price: Number(item.price),
      })),
      images: variant.images.map((vi: (typeof variant.images)[number]) => ({
        id: vi.id,
        url: getImageUrl(vi.image.path),
        alt: vi.alt,
      })),
    })),
  }))

  // Wishlist для авторизованных
  let wishlistVariantIds: string[] = []
  if (session?.user) {
    const wishlist = await db.wishlist.findUnique({
      where: { userId: session.user.id },
      include: {
        items: {
          select: { productVariantId: true },
        },
      },
    })
    wishlistVariantIds = wishlist?.items.map((item: { productVariantId: string }) => item.productVariantId) || []
  }

  return {
    products: serialized,
    wishlistVariantIds,
    isAuthenticated: !!session?.user,
  }
}
