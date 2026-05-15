'use client'

import { getProductsByIds } from '@/app/_actions/get-products-by-ids'
import { useRecentlyViewed } from '@/app/_hooks/use-recently-viewed'
import type { SerializedProduct } from '@/lib/recommendation-utils'
import { Container, Grid, Heading, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { ProductCard } from '../catalog/_components/product-card'

/** Макс. количество товаров на главной */
const MAX_ON_HOME = 4

/**
 * Блок "Недавно просмотренные" на главной странице.
 * Client Component — данные из localStorage + server action для загрузки товаров.
 */
export function RecentlyViewedProducts() {
  const { productIds } = useRecentlyViewed()
  const [products, setProducts] = useState<SerializedProduct[]>([])
  const [wishlistVariantIds, setWishlistVariantIds] = useState<string[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const ids = productIds.slice(0, MAX_ON_HOME)
    if (ids.length === 0) {
      setProducts([])
      return
    }

    void getProductsByIds(ids).then((result) => {
      // Сортируем в порядке просмотра (по порядку из хука)
      const productMap = new Map(result.products.map((p) => [p.id, p]))
      const sorted = ids.reduce<SerializedProduct[]>((acc: SerializedProduct[], id: string) => {
        const product = productMap.get(id)
        if (product) {
          acc.push(product)
        }
        return acc
      }, [])
      setProducts(sorted)
      setWishlistVariantIds(result.wishlistVariantIds)
      setIsAuthenticated(result.isAuthenticated)
    })
  }, [productIds])

  if (products.length === 0) {
    return null
  }

  return (
    <Container maxW="7xl" py={{ base: 12, md: 16 }}>
      <VStack gap={10} align="stretch">
        <VStack gap={3} textAlign="center">
          <Heading as="h2" size="2xl" textTransform="none">
            Недавно просмотренные
          </Heading>
          <Text fontSize="lg" color="fg.muted">
            Товары, которые вы недавно смотрели
          </Text>
        </VStack>

        <Grid
          templateColumns={{
            base: 'repeat(1, 1fr)',
            sm: 'repeat(2, 1fr)',
            lg: 'repeat(4, 1fr)',
          }}
          gap={6}
        >
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isAuthenticated={isAuthenticated}
              wishlistVariantIds={wishlistVariantIds}
            />
          ))}
        </Grid>
      </VStack>
    </Container>
  )
}
