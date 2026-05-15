import type { Gender } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { getRecommendedProducts, getWishlistVariantIds } from '@/lib/recommendation-utils'
import { Grid, Heading, VStack } from '@chakra-ui/react'
import { ProductCard } from '../../catalog/_components/product-card'

interface CartRecommendationsProps {
  /** ID товаров, уже лежащих в корзине */
  productIdsInCart: string[]
  /** Категории товаров в корзине */
  categoriesInCart: (string | null)[]
  /** Преобладающий пол товаров в корзине */
  genderInCart: Gender
}

/** Блок "Может пригодиться" на странице корзины */
export async function CartRecommendations({
  productIdsInCart,
  categoriesInCart,
  genderInCart,
}: CartRecommendationsProps) {
  const session = await getSession()
  const db = getEnhancedPrisma()

  // Первая непустая категория из корзины
  const primaryCategory = categoriesInCart.find((c): c is string => c !== null) || null

  const products = await getRecommendedProducts(db, {
    excludeIds: productIdsInCart,
    categoryId: primaryCategory,
    gender: genderInCart,
    limit: 4,
  })

  if (products.length === 0) {
    return null
  }

  // Загрузка wishlist
  const wishlistVariantIds = session?.user ? await getWishlistVariantIds(db, session.user.id) : []

  return (
    <VStack gap={8} align="stretch" mt={12}>
      <Heading as="h2" size="xl" textAlign="center" textTransform="none">
        Может пригодиться
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
