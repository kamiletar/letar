import type { Gender } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getRecommendedProducts, getWishlistVariantIds } from '@/lib/recommendation-utils'
import { Grid, Heading, VStack } from '@chakra-ui/react'
import { ProductCard } from '../../_components/product-card'

interface SimilarProductsProps {
  /** ID текущего товара (исключить из рекомендаций) */
  productId: string
  /** Категория текущего товара */
  categoryId: string | null
  /** Пол текущего товара */
  gender: Gender
  /** ID продавца (исключить, чтобы показать товары других продавцов тоже) */
  sellerId: string
}

/** Блок "Похожие товары" на странице товара */
export async function SimilarProducts({ productId, categoryId, gender }: SimilarProductsProps) {
  const session = await getSession()
  const db = getEnhancedPrisma()

  const products = await getRecommendedProducts(db, {
    excludeIds: [productId],
    categoryId,
    gender,
    limit: 4,
  })

  if (products.length === 0) {
    return null
  }

  // Загрузка wishlist если авторизован
  const wishlistVariantIds = session?.user ? await getWishlistVariantIds(db, session.user.id) : []

  return (
    <VStack gap={8} align="stretch" mt={12}>
      <Heading as="h2" size="xl" textAlign="center" textTransform="none">
        Похожие товары
      </Heading>

      <Grid
        templateColumns={{
          base: 'repeat(1, 1fr)',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
        }}
        gap={6}
      >
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isAuthenticated={!!session?.user}
            wishlistVariantIds={wishlistVariantIds}
          />
        ))}
      </Grid>
    </VStack>
  )
}
