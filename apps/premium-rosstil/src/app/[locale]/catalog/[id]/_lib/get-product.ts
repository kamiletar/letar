import { getEnhancedPrisma } from '@/lib/db'
import { cache } from 'react'

/** Кэшированный запрос продукта — дедупликация между generateMetadata и page */
export const getProduct = cache(async (id: string) => {
  const db = getEnhancedPrisma()

  return db.product.findUnique({
    where: { id },
    include: {
      seller: {
        select: {
          shopName: true,
          slug: true,
          description: true,
          status: true,
        },
      },
      variants: {
        include: {
          items: {
            include: {
              size: true,
            },
            orderBy: {
              sizeId: 'asc',
            },
          },
          images: {
            include: {
              image: true,
            },
            orderBy: {
              order: 'asc',
            },
          },
        },
      },
    },
  })
})
