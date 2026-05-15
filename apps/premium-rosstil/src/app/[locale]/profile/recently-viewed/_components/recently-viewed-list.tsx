'use client'

import { getProductsByIds } from '@/app/_actions/get-products-by-ids'
import { useRecentlyViewed } from '@/app/_hooks/use-recently-viewed'
import type { SerializedProduct } from '@/lib/recommendation-utils'
import { Button, Grid, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { FaTrash } from 'react-icons/fa'
import { ProductCard } from '../../../catalog/_components/product-card'

/**
 * Список всех недавно просмотренных товаров в профиле.
 * Показывает до 20 товаров с возможностью очистки истории.
 */
export function RecentlyViewedList() {
  const { productIds, clearHistory } = useRecentlyViewed()
  const [products, setProducts] = useState<SerializedProduct[]>([])
  const [wishlistVariantIds, setWishlistVariantIds] = useState<string[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (productIds.length === 0) {
      setProducts([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    void getProductsByIds(productIds).then((result) => {
      // Сортируем в порядке просмотра
      const productMap = new Map(result.products.map((p) => [p.id, p]))
      const sorted = productIds.reduce<SerializedProduct[]>((acc: SerializedProduct[], id: string) => {
        const product = productMap.get(id)
        if (product) {
          acc.push(product)
        }
        return acc
      }, [])
      setProducts(sorted)
      setWishlistVariantIds(result.wishlistVariantIds)
      setIsAuthenticated(result.isAuthenticated)
      setIsLoading(false)
    })
  }, [productIds])

  return (
    <VStack gap={6} align="stretch">
      <HStack justify="space-between" flexWrap="wrap">
        <Heading size="xl" textTransform="none">
          Недавно просмотренные
        </Heading>
        {products.length > 0 && (
          <Button size="sm" variant="ghost" colorPalette="fg" onClick={clearHistory}>
            <FaTrash />
            Очистить историю
          </Button>
        )}
      </HStack>

      {isLoading ? (
        <Text color="fg.muted">Загрузка...</Text>
      ) : products.length === 0 ? (
        <Text color="fg.muted" py={8} textAlign="center">
          Вы ещё не просматривали товары
        </Text>
      ) : (
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
              isAuthenticated={isAuthenticated}
              wishlistVariantIds={wishlistVariantIds}
            />
          ))}
        </Grid>
      )}
    </VStack>
  )
}
