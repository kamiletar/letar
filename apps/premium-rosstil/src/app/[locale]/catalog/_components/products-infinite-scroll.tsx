'use client'

import { Box, Button, Grid, Spinner, Text, VStack } from '@chakra-ui/react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import type { CatalogProductsResult } from '../_actions/fetch-catalog-products'
import { fetchCatalogProducts } from '../_actions/fetch-catalog-products'
import { ProductCard } from './product-card'

interface ProductsInfiniteScrollProps {
  /** Начальные данные от сервера (SSR) */
  initialData: CatalogProductsResult
  /** Авторизован ли пользователь */
  isAuthenticated: boolean
}

/** Каталог с бесконечной прокруткой — автозагрузка при скролле */
export function ProductsInfiniteScroll({ initialData, isAuthenticated }: ProductsInfiniteScrollProps) {
  const searchParams = useSearchParams()
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Извлекаем фильтры из URL (без page — управляется через useInfiniteQuery)
  const filters = {
    category: searchParams.get('category') ?? undefined,
    gender: searchParams.get('gender') ?? undefined,
    newCollection: searchParams.get('new') === 'true',
    sort: searchParams.get('sort') ?? undefined,
    query: searchParams.get('q') ?? undefined,
    color: searchParams.get('color') ?? undefined,
    size: searchParams.get('size') ?? undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    seller: searchParams.get('seller') ?? undefined,
  }

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching } = useInfiniteQuery({
    queryKey: ['catalog-products-infinite', filters],
    queryFn: ({ pageParam }) => fetchCatalogProducts({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.currentPage < lastPage.totalPages) {
        return lastPage.currentPage + 1
      }
      return undefined
    },
    initialData: {
      pages: [initialData],
      pageParams: [1],
    },
    staleTime: 2 * 60 * 1000,
  })

  // IntersectionObserver для автозагрузки при приближении к концу списка
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  )

  useEffect(() => {
    const element = loadMoreRef.current
    if (!element) {
      return
    }

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: '200px', // Подгрузка начинается за 200px до конца
    })
    observer.observe(element)

    return () => observer.disconnect()
  }, [handleObserver])

  // Собираем все продукты из всех страниц
  const allProducts = data?.pages.flatMap((page) => page.products) ?? []
  // Wishlist — одинаков для всех страниц (полный список пользователя)
  const wishlistVariantIds = data?.pages[0]?.wishlistVariantIds ?? []
  const totalCount = data?.pages[0]?.totalCount ?? 0
  const selectedColor = filters.color

  if (allProducts.length === 0 && !isFetching) {
    return (
      <Box textAlign="center" py={16}>
        <Text fontSize="lg" color="fg.muted">
          {filters.query
            ? `По запросу "${filters.query}" ничего не найдено`
            : filters.category ||
                filters.gender ||
                filters.newCollection ||
                filters.color ||
                filters.size ||
                filters.minPrice ||
                filters.maxPrice ||
                filters.seller
              ? 'Нет продуктов, соответствующих фильтрам'
              : 'Пока нет продуктов в каталоге'}
        </Text>
      </Box>
    )
  }

  return (
    <VStack gap={0} align="stretch" opacity={isFetching && !isFetchingNextPage ? 0.7 : 1} transition="opacity 0.15s">
      <Grid
        data-testid="catalog-grid"
        templateColumns={{
          base: 'repeat(1, 1fr)',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(2, 1fr)',
          lg: 'repeat(3, 1fr)',
          xl: 'repeat(4, 1fr)',
        }}
        gap={6}
        p={6}
      >
        {allProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isAuthenticated={isAuthenticated}
            wishlistVariantIds={wishlistVariantIds}
            selectedColorSlug={selectedColor}
          />
        ))}
      </Grid>

      {/* Триггер автозагрузки + кнопка «Загрузить ещё» как fallback */}
      <Box ref={loadMoreRef} textAlign="center" py={6}>
        {isFetchingNextPage ? (
          <Spinner size="lg" color="fg.muted" />
        ) : hasNextPage ? (
          <Button variant="outline" colorPalette="fg" onClick={() => fetchNextPage()}>
            Загрузить ещё
          </Button>
        ) : allProducts.length > 0 ? (
          <Text fontSize="sm" color="fg.muted">
            Показано {allProducts.length} из {totalCount} товаров
          </Text>
        ) : null}
      </Box>
    </VStack>
  )
}
