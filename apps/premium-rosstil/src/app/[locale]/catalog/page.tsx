import type { Gender } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CatalogFilters } from './_components/catalog-filters'
import { ProductsList } from './_components/products-list'
import { buildCatalogWhere } from './_lib/build-catalog-where'
import CatalogLoading from './loading'

export const metadata: Metadata = {
  title: 'Каталог — Премиум РосСтиль',
  description:
    'Каталог дизайнерской одежды премиум-класса от Елены Аксяновой. Эксклюзивные модели с энергетикой любви и гармонии.',
  openGraph: {
    title: 'Каталог дизайнерской одежды',
    description: 'Эксклюзивные модели премиум-класса от Елены Аксяновой',
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Премиум РосСтиль',
  },
}

interface CatalogPageProps {
  searchParams: Promise<{
    category?: string
    gender?: string
    new?: string
    sort?: string
    page?: string
    q?: string
    color?: string
    size?: string
    minPrice?: string
    maxPrice?: string
    seller?: string
  }>
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams

  const session = await getSession()
  const db = getEnhancedPrisma(session?.user)

  // Метаданные для фильтров (категории, цвета, размеры, диапазон цен)
  const [categories, colors, sizes, priceAggregation, totalProducts] = await Promise.all([
    db.category.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true },
    }),
    db.color.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, hex: true },
    }),
    db.productSize.findMany({
      orderBy: { international: 'asc' },
      select: { id: true, international: true },
      distinct: ['international'],
    }),
    db.productItem.aggregate({
      _min: { price: true },
      _max: { price: true },
    }),
    db.product.count(),
  ])

  const priceRange = {
    min: priceAggregation._min.price ? Number(priceAggregation._min.price) : 0,
    max: priceAggregation._max.price ? Number(priceAggregation._max.price) : 100000,
  }

  // Подсчёт отфильтрованных (для бейджа в фильтрах)
  const minPrice = params.minPrice ? Number(params.minPrice) : undefined
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined

  const where = buildCatalogWhere({
    category: params.category,
    gender: params.gender as Gender | undefined,
    newCollection: params.new === 'true',
    query: params.q,
    color: params.color,
    size: params.size,
    minPrice,
    maxPrice,
    seller: params.seller,
  })

  const filteredCount = await db.product.count({ where: where as never })

  return (
    <Box py={8} bg={'bg.subtle'}>
      <Container maxW="7xl">
        <CatalogFilters
          categories={categories}
          colors={colors}
          sizes={sizes}
          totalProducts={totalProducts}
          filteredCount={filteredCount}
          currentQuery={params.q}
          priceRange={priceRange}
          currentMinPrice={minPrice}
          currentMaxPrice={maxPrice}
        />

        <Suspense fallback={<CatalogLoading />}>
          <ProductsList
            category={params.category}
            gender={params.gender as Gender | undefined}
            newCollection={params.new === 'true'}
            sort={params.sort}
            page={params.page ? parseInt(params.page, 10) : 1}
            query={params.q}
            color={params.color}
            size={params.size}
            minPrice={minPrice}
            maxPrice={maxPrice}
            seller={params.seller}
          />
        </Suspense>
      </Container>
    </Box>
  )
}
