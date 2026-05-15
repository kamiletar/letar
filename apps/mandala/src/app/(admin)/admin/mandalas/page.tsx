import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Heading, HStack, Link, Stack, Text } from '@chakra-ui/react'
import { EmptyState, Pagination, SearchFilter, StatusFilter, TableSkeleton } from '@letar/admin-ui'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { LuImage, LuPlus } from 'react-icons/lu'
import { MandalasTable } from './_components/mandalas-table'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Мандалы - Админ',
}

const PAGE_SIZE = 10

interface MandalasPageProps {
  searchParams: Promise<{
    q?: string
    published?: string
    page?: string
  }>
}

export default async function MandalasListPage({ searchParams }: MandalasPageProps) {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'ADMIN') {
    return notFound()
  }

  const { q, published, page } = await searchParams
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

  const db = getEnhancedPrisma(session.user)

  // Параллельно запрашиваем данные и count
  const [mandalas, total] = await Promise.all([
    db.mandala.findMany({
      where,
      orderBy: { order: 'asc' },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.mandala.count({ where }),
  ])

  const hasFilters = q || published !== undefined

  return (
    <Stack gap={6}>
      <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Heading size={{ base: 'md', md: 'lg' }}>Мандалы</Heading>
        <Button colorPalette="purple" asChild size={{ base: 'sm', md: 'md' }}>
          <Link href="/admin/mandalas/new">
            <LuPlus />
            <Box display={{ base: 'none', sm: 'inline' }}>Создать мандалу</Box>
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
      </HStack>

      {mandalas.length === 0 ? (
        hasFilters ? (
          <Box py={8} textAlign="center">
            <Text color="fg.muted">Ничего не найдено по заданным фильтрам</Text>
          </Box>
        ) : (
          <EmptyState
            icon={LuImage}
            title="Нет мандал"
            description="Создайте первую мандалу для галереи"
            action={{ label: 'Создать мандалу', href: '/admin/mandalas/new' }}
          />
        )
      ) : (
        <>
          <Suspense fallback={<TableSkeleton rows={PAGE_SIZE} columns={6} />}>
            <MandalasTable mandalas={mandalas} />
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
