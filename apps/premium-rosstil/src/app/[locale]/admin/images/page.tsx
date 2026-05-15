import type { ImageCategory } from '@/generated/prisma'
import { requireAdmin } from '@/lib/auth'
import { Box, Card, Container, Heading, HStack, Link, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { getImages, getImagesStats } from './_actions/get-images'
import { CleanupButton } from './_components/cleanup-button'
import { ImageFilters } from './_components/image-filters'
import { ImagesStatsCard } from './_components/images-stats'
import { ImagesTable } from './_components/images-table'
import { Pagination } from './_components/pagination'
import { SyncPanel } from './_components/sync-panel'

interface PageProps {
  searchParams: Promise<{
    category?: ImageCategory
    search?: string
    unused?: string
    page?: string
  }>
}

export default async function AdminImagesPage({ searchParams }: PageProps) {
  await requireAdmin()
  const params = await searchParams

  // Парсим параметры фильтрации
  const category = params.category as ImageCategory | undefined
  const search = params.search
  const unused = params.unused === 'true'
  const page = params.page ? parseInt(params.page, 10) : 1

  // Получаем данные параллельно
  const [imagesResult, stats] = await Promise.all([
    getImages({
      category,
      search,
      unused: params.unused ? unused : undefined,
      page,
      perPage: 20,
    }),
    getImagesStats(),
  ])

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin">← Вернуться к панели администратора</NextLink>
          </Link>
          <HStack justify="space-between" align="start" mb={2}>
            <Heading size="2xl" textTransform="none">
              Изображения
            </Heading>
            <CleanupButton unusedCount={stats.unused} />
          </HStack>
          <Text color="fg.muted">Управление изображениями магазина</Text>
        </Box>

        {/* Статистика */}
        <ImagesStatsCard stats={stats} />

        {/* Синхронизация */}
        <SyncPanel />

        {/* Фильтры */}
        <Card.Root>
          <Card.Body>
            <ImageFilters
              currentCategory={category}
              currentSearch={search}
              currentUnused={params.unused ? unused : undefined}
            />
          </Card.Body>
        </Card.Root>

        {/* Таблица изображений */}
        <Card.Root>
          <Card.Body p={0}>
            <ImagesTable images={imagesResult.images} />
          </Card.Body>
        </Card.Root>

        {/* Пагинация */}
        <Pagination page={imagesResult.page} totalPages={imagesResult.totalPages} total={imagesResult.total} />
      </VStack>
    </Container>
  )
}
