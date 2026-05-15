'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

export interface ProductVariantInfo {
  variantId: string
  variantColor: string
  variantComposition: string
  itemCount: number
  imageCount: number
}

export async function getProductUsage(id: string) {
  // 1. Аутентификация
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  // 2. Получение DB клиента
  const db = getEnhancedPrisma(session.user)

  // 3. Получить информацию о вариантах продукта
  const variants = await db.productVariant.findMany({
    where: { productId: id },
    include: {
      items: true,
      images: true,
    },
  })

  type VariantResult = (typeof variants)[number]
  const variantInfos: ProductVariantInfo[] = variants.map((variant: VariantResult) => ({
    variantId: variant.id,
    variantColor: variant.color,
    variantComposition: variant.composition,
    itemCount: variant.items.length,
    imageCount: variant.images.length,
  }))

  return {
    isUsed: variants.length > 0,
    variants: variantInfos,
    count: variants.length,
  }
}
