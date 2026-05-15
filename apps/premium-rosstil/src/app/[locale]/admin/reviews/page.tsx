import { StarRating } from '@/app/_components/star-rating'
import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Button, Container, Heading, HStack, Link, Table, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { ReviewActions } from './_components/review-actions'
import { REVIEW_STATUS_LABELS, ReviewStatusBadge } from './_components/review-status-badge'

/** Тип отзыва с relations */
type ReviewWithRelations = {
  id: string
  rating: number
  text: string | null
  status: string
  createdAt: Date
  hiddenReason: string | null
  response: string | null
  author: { name: string | null; email: string }
  product: { id: string; name: string; seller: { shopName: string } }
}

interface PageProps {
  searchParams: Promise<{ status?: string }>
}

export default async function AdminReviewsPage({ searchParams }: PageProps) {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  const params = await searchParams
  const statusFilter = params.status

  // Фильтр по статусу
  const where: Record<string, unknown> = {}
  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter as never
  }

  // Параллельная загрузка данных
  const [totalCount, hiddenCount, reviews] = await Promise.all([
    (db.review as any).count(),
    (db.review as any).count({ where: { status: 'HIDDEN' } }),
    (db.review as any).findMany({
      where: where as never,
      include: {
        author: { select: { name: true, email: true } },
        product: {
          select: {
            id: true,
            name: true,
            seller: { select: { shopName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }) as ReviewWithRelations[],
  ])

  const statuses = ['ALL', ...Object.keys(REVIEW_STATUS_LABELS)]

  return (
    <Container maxW="8xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin">&larr; Панель администратора</NextLink>
          </Link>
          <HStack justify="space-between" align="center" mb={2}>
            <Heading size="2xl" textTransform="none">
              Отзывы
            </Heading>
            {hiddenCount > 0 && (
              <Badge colorPalette="yellow" fontSize="md" px={3} py={1}>
                {hiddenCount} скрыто
              </Badge>
            )}
          </HStack>
          <Text color="fg.muted">Модерация отзывов покупателей</Text>
        </Box>

        {/* Фильтр по статусу */}
        <HStack gap={2} flexWrap="wrap">
          {statuses.map((s) => {
            const isActive = (s === 'ALL' && !statusFilter) || statusFilter === s
            return (
              <Button
                key={s}
                asChild
                size="sm"
                variant={isActive ? 'solid' : 'outline'}
                colorPalette={isActive ? 'fg' : undefined}
              >
                <NextLink href={s === 'ALL' ? '/admin/reviews' : `/admin/reviews?status=${s}`}>
                  {s === 'ALL' ? `Все (${totalCount})` : REVIEW_STATUS_LABELS[s]}
                </NextLink>
              </Button>
            )
          })}
        </HStack>

        {/* Таблица отзывов */}
        <Box overflowX="auto">
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Товар</Table.ColumnHeader>
                <Table.ColumnHeader>Автор</Table.ColumnHeader>
                <Table.ColumnHeader>Рейтинг</Table.ColumnHeader>
                <Table.ColumnHeader>Текст</Table.ColumnHeader>
                <Table.ColumnHeader>Статус</Table.ColumnHeader>
                <Table.ColumnHeader>Продавец</Table.ColumnHeader>
                <Table.ColumnHeader>Дата</Table.ColumnHeader>
                <Table.ColumnHeader>Действия</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {reviews.map((r: ReviewWithRelations) => (
                <Table.Row key={r.id}>
                  <Table.Cell>
                    <Link asChild fontSize="sm" fontWeight="medium">
                      <NextLink href={`/catalog/${r.product.id}`}>{r.product.name}</NextLink>
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <VStack align="start" gap={0}>
                      <Text fontSize="sm">{r.author.name || 'Без имени'}</Text>
                      <Text fontSize="xs" color="fg.muted">
                        {r.author.email}
                      </Text>
                    </VStack>
                  </Table.Cell>
                  <Table.Cell>
                    <StarRating rating={r.rating} size="sm" />
                  </Table.Cell>
                  <Table.Cell maxW="250px">
                    <Text fontSize="sm" lineClamp={2}>
                      {r.text || '—'}
                    </Text>
                    {r.hiddenReason && (
                      <Text fontSize="xs" color="red.500" mt={1}>
                        Причина: {r.hiddenReason}
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <ReviewStatusBadge status={r.status} />
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{r.product.seller.shopName}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" color="fg.muted">
                      {new Date(r.createdAt).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <ReviewActions reviewId={r.id} status={r.status} />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>

          {reviews.length === 0 && (
            <Box textAlign="center" py={8}>
              <Text color="fg.muted">Нет отзывов для отображения</Text>
            </Box>
          )}
        </Box>
      </VStack>
    </Container>
  )
}
