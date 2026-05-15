'use client'

import { Box, Grid, HStack, Text, VStack } from '@chakra-ui/react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import type { CatalogProductsResult } from '../_actions/fetch-catalog-products'
import { fetchCatalogProducts } from '../_actions/fetch-catalog-products'
import { CatalogPagination } from './catalog-pagination'
import { ProductCard } from './product-card'
import { ProductsInfiniteScroll } from './products-infinite-scroll'
import { ViewModeToggle } from './view-mode-toggle'

interface ProductsListClientProps {
  /** Начальные данные от сервера (SSR) */
  initialData: CatalogProductsResult
  /** Авторизован ли пользователь */
  isAuthenticated: boolean
}

/** Клиентский каталог — пагинация или бесконечная прокрутка */
export function ProductsListClient({ initialData, isAuthenticated }: ProductsListClientProps) {
  const searchParams = useSearchParams()
  const isScrollMode = searchParams.get('view') === 'scroll'

  // В режиме бесконечной прокрутки — отдельный компонент с useInfiniteQuery
  if (isScrollMode) {
    return (
      <VStack gap={0} align="stretch">
        <HStack justify="flex-end" px={6} pt={2}>
          <ViewModeToggle />
        </HStack>
        <ProductsInfiniteScroll initialData={initialData} isAuthenticated={isAuthenticated} />
      </VStack>
    )
  }

  // Режим пагинации (по умолчанию) — отдельный компонент
  return <ProductsPaginatedView initialData={initialData} isAuthenticated={isAuthenticated} />
}

/** Каталог с постраничной навигацией (по умолчанию) */
function ProductsPaginatedView({ initialData, isAuthenticated }: ProductsListClientProps) {
  const searchParams = useSearchParams()

  // Извлекаем фильтры из URL
  const filters = {
    category: searchParams.get('category') ?? undefined,
    gender: searchParams.get('gender') ?? undefined,
    newCollection: searchParams.get('new') === 'true',
    sort: searchParams.get('sort') ?? undefined,
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
    query: searchParams.get('q') ?? undefined,
    color: searchParams.get('color') ?? undefined,
    size: searchParams.get('size') ?? undefined,
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined,
    seller: searchParams.get('seller') ?? undefined,
  }

  const { data, isFetching } = useQuery({
    queryKey: ['catalog-products', filters],
    queryFn: () => fetchCatalogProducts(filters),
    initialData,
    // Показываем предыдущие данные пока новые загружаются (без мерцания)
    placeholderData: keepPreviousData,
    // Кэш живёт 2 минуты — мгновенная навигация назад
    staleTime: 2 * 60 * 1000,
  })

  const { products, totalCount, totalPages, currentPage, wishlistVariantIds } = data
  const selectedColor = filters.color

  if (products.length === 0) {
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
    <VStack gap={0} align="stretch" opacity={isFetching ? 0.7 : 1} transition="opacity 0.15s">
      <HStack justify="flex-end" px={6} pt={2}>
        <ViewModeToggle />
      </HStack>

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
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isAuthenticated={isAuthenticated}
            wishlistVariantIds={wishlistVariantIds}
            selectedColorSlug={selectedColor}
          />
        ))}
      </Grid>

      <CatalogPagination currentPage={currentPage} totalPages={totalPages} totalItems={totalCount} itemsPerPage={12} />
    </VStack>
  )
}
