import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Heading, HStack, Link, Stack, Text } from '@chakra-ui/react'
import { EmptyState, Pagination, SearchFilter, StatusFilter, TableSkeleton } from '@letar/admin-ui'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { LuPackage, LuPlus } from 'react-icons/lu'
import { ProductsTable } from './_components/products-table'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Товары - Админ',
}

const PAGE_SIZE = 10

interface ProductsPageProps {
  searchParams: Promise<{
    q?: string
    published?: string
    inStock?: string
    page?: string
  }>
}

export default async function ProductsListPage({ searchParams }: ProductsPageProps) {
  const session = await getSession()

  if (!session?.user || session.user.role !== 'ADMIN') {
    return notFound()
  }

  const { q, published, inStock, page } = await searchParams
  const currentPage = Number(page) || 1

  // Строим условия фильтрации
  // ZenStack v3: не используем Prisma типы напрямую
  const where: Record<string, unknown> = {}

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (published !== undefined) {
    where.published = published === 'true'
  }

  if (inStock !== undefined) {
    where.inStock = inStock === 'true'
  }

  const db = getEnhancedPrisma(session.user)

  // Параллельно запрашиваем данные и count
  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      // Вторичный ключ сортировки обязателен: у всех новых записей order по
      // умолчанию 0, без createdAt как тайбрейкера Postgres возвращает записи
      // с одинаковым order в недетерминированном порядке — новый товар
      // может не попасть на первую страницу списка
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: { images: { orderBy: { order: 'asc' }, take: 1 } },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.product.count({ where }),
  ])

  const hasFilters = q || published !== undefined || inStock !== undefined

  return (
    <Stack gap={6}>
      <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Heading size={{ base: 'md', md: 'lg' }}>Товары</Heading>
        <Button colorPalette="purple" asChild size={{ base: 'sm', md: 'md' }}>
          <Link href="/admin/products/new">
            <LuPlus />
            <Box display={{ base: 'none', sm: 'inline' }}>Создать товар</Box>
          </Link>
        </Button>
      </HStack>

      {/* Панель поиска и фильтров */}
      <HStack gap={4} flexWrap="wrap">
        <Suspense fallback={<Box h="32px" />}>
          <SearchFilter placeholder="Поиск по названию, slug..." />
        </Suspense>
        <Suspense fallback={<Box h="24px" />}>
          <StatusFilter
            paramName="published"
            options={[
              { value: 'true', label: 'Опубликовано' },
              { value: 'false', label: 'Скрыто' },
            ]}
          />
        </Suspense>
        <Suspense fallback={<Box h="24px" />}>
          <StatusFilter
            paramName="inStock"
            options={[
              { value: 'true', label: 'В наличии' },
              { value: 'false', label: 'Нет в наличии' },
            ]}
          />
        </Suspense>
      </HStack>

      {products.length === 0
        ? (
          hasFilters
            ? (
              <Box py={8} textAlign="center">
                <Text color="fg.muted">Ничего не найдено по заданным фильтрам</Text>
              </Box>
            )
            : (
              <EmptyState
                icon={LuPackage}
                title="Нет товаров"
                description="Создайте первый товар для магазина"
                action={{ label: 'Создать товар', href: '/admin/products/new' }}
              />
            )
        )
        : (
          <>
            <Suspense fallback={<TableSkeleton rows={PAGE_SIZE} columns={6} />}>
              <ProductsTable products={products} />
            </Suspense>

            {/* Пагинация */}
            <Suspense fallback={<Box h="48px" />}>
              <Pagination total={total} pageSize={PAGE_SIZE} />
            </Suspense>
          </>
        )}
    </Stack>
  )
}
