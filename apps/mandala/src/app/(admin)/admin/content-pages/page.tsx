import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Heading, HStack, Link, Stack, Text } from '@chakra-ui/react'
import { EmptyState, Pagination, SearchFilter, StatusFilter, TableSkeleton } from '@letar/admin-ui'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { LuFileText, LuPlus } from 'react-icons/lu'
import { ContentPagesTable } from './_components/content-pages-table'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Страницы - Админ',
}

const PAGE_SIZE = 10

interface ContentPagesPageProps {
  searchParams: Promise<{
    q?: string
    published?: string
    page?: string
  }>
}

export default async function ContentPagesListPage({ searchParams }: ContentPagesPageProps) {
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
      { title: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
      { content: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (published !== undefined) {
    where.published = published === 'true'
  }

  const db = getEnhancedPrisma(session.user)

  // Параллельно запрашиваем данные и count
  const [pages, total] = await Promise.all([
    db.contentPage.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.contentPage.count({ where }),
  ])

  const hasFilters = q || published !== undefined

  return (
    <Stack gap={6}>
      <HStack justify="space-between" align="center" flexWrap="wrap" gap={3}>
        <Heading size={{ base: 'md', md: 'lg' }}>Страницы контента</Heading>
        <Button colorPalette="purple" asChild size={{ base: 'sm', md: 'md' }}>
          <Link href="/admin/content-pages/new">
            <LuPlus />
            <Box display={{ base: 'none', sm: 'inline' }}>Создать страницу</Box>
          </Link>
        </Button>
      </HStack>

      {/* Панель поиска и фильтров */}
      <HStack gap={4} flexWrap="wrap">
        <Suspense fallback={<Box h="32px" />}>
          <SearchFilter placeholder="Поиск по заголовку, slug..." />
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

      {pages.length === 0 ? (
        hasFilters ? (
          <Box py={8} textAlign="center">
            <Text color="fg.muted">Ничего не найдено по заданным фильтрам</Text>
          </Box>
        ) : (
          <EmptyState
            icon={LuFileText}
            title="Нет страниц"
            description="Создайте первую страницу контента"
            action={{ label: 'Создать страницу', href: '/admin/content-pages/new' }}
          />
        )
      ) : (
        <>
          <Suspense fallback={<TableSkeleton rows={PAGE_SIZE} columns={6} />}>
            <ContentPagesTable pages={pages} />
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
