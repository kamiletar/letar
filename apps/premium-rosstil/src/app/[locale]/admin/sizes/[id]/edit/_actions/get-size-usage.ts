'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'

/**
 * Product variant info that uses this size
 */
export interface SizeUsageInfo {
  productId: string
  productName: string
  variantId: string
  variantColor: string
  variantComposition: string
  itemId: string
  itemPrice: string
  itemAvailable: number
}

/**
 * Server action for checking if a ProductSize is in use.
 * Returns list of products and variants using this size.
 */
export async function getSizeUsage(
  sizeId: string
): Promise<{ isUsed: boolean; items: SizeUsageInfo[]; count: number }> {
  // 1. Authenticate and check admin role
  const session = await getSession()

  if (!session?.user) {
    throw new Error('Unauthorized')
  }

  if (session.user.role !== 'ADMIN') {
    throw new Error('Forbidden: Admin access required')
  }

  // 2. Get enhanced Prisma client with ZenStack policies
  const db = getEnhancedPrisma(session.user)

  // 3. Find all ProductItems that use this size with their products and variants
  const items = await db.productItem.findMany({
    where: {
      sizeId,
    },
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: [{ variant: { product: { name: 'asc' } } }, { variant: { color: 'asc' } }],
  })

  // 4. Transform to usage info
  type ItemResult = (typeof items)[number]
  const usageInfo: SizeUsageInfo[] = items.map((item: ItemResult) => ({
    productId: item.variant.product.id,
    productName: item.variant.product.name,
    variantId: item.variant.id,
    variantColor: item.variant.color,
    variantComposition: item.variant.composition,
    itemId: item.id,
    itemPrice: item.price.toString(),
    itemAvailable: item.availableCount,
  }))

  return {
    isUsed: items.length > 0,
    items: usageInfo,
    count: items.length,
  }
}
