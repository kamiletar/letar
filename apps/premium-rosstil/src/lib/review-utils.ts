/**
 * Утилиты для пересчёта агрегированных рейтингов товаров и продавцов.
 */

type DbClient = {
  review: {
    aggregate: (args: unknown) => Promise<{ _avg: { rating: number | null }; _count: { rating: number } }>
  }
  product: {
    update: (args: unknown) => Promise<unknown>
    findUnique: (args: unknown) => Promise<{ sellerId: string } | null>
  }
  seller: {
    update: (args: unknown) => Promise<unknown>
  }
}

/**
 * Пересчитать средний рейтинг и количество отзывов для товара.
 */
export async function recalculateProductRating(db: DbClient, productId: string) {
  const result = await (db.review as any).aggregate({
    where: { productId, status: 'PUBLISHED' },
    _avg: { rating: true },
    _count: { rating: true },
  })

  await (db.product as any).update({
    where: { id: productId },
    data: {
      averageRating: result._avg.rating ? Math.round(result._avg.rating * 10) / 10 : null,
      reviewCount: result._count.rating,
    },
  })
}

/**
 * Пересчитать средний рейтинг и количество отзывов для продавца
 * (по всем опубликованным отзывам на его товары).
 */
export async function recalculateSellerRating(db: DbClient, sellerId: string) {
  const result = await (db.review as any).aggregate({
    where: { product: { sellerId }, status: 'PUBLISHED' },
    _avg: { rating: true },
    _count: { rating: true },
  })

  await (db.seller as any).update({
    where: { id: sellerId },
    data: {
      averageRating: result._avg.rating ? Math.round(result._avg.rating * 10) / 10 : null,
      reviewCount: result._count.rating,
    },
  })
}

/**
 * Пересчитать рейтинг товара и его продавца.
 * Удобная обёртка, которая сначала определяет sellerId из товара.
 */
export async function recalculateRatings(db: DbClient, productId: string) {
  await recalculateProductRating(db, productId)

  const product = await (db.product as any).findUnique({
    where: { id: productId },
    select: { sellerId: true },
  })

  if (product?.sellerId) {
    await recalculateSellerRating(db, product.sellerId)
  }
}
