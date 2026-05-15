import { StarRating } from '@/app/_components/star-rating'
import { requireSeller } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Card, Container, Heading, HStack, Link, Table, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { RespondForm } from './_components/respond-form'

/** Тип отзыва с relations */
type SellerReview = {
  id: string
  rating: number
  text: string | null
  response: string | null
  respondedAt: Date | null
  createdAt: Date
  author: { name: string | null }
  product: { id: string; name: string }
}

export default async function SellerReviewsPage() {
  const user = await requireSeller()
  const db = getEnhancedPrisma(user)

  // Найти Seller текущего пользователя
  const seller = await db.seller.findUnique({
    where: { userId: user.id },
    select: { id: true, averageRating: true, reviewCount: true },
  })

  if (!seller) {
    return (
      <Container maxW="7xl" py={8}>
        <Text>Профиль продавца не найден.</Text>
      </Container>
    )
  }

  // Загрузить отзывы к товарам продавца
  const reviews = (await (db.review as any).findMany({
    where: {
      product: { sellerId: seller.id },
      status: 'PUBLISHED',
    },
    include: {
      author: { select: { name: true } },
      product: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })) as SellerReview[]

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Heading size="2xl" textTransform="none">
            Отзывы
          </Heading>
          <Text color="fg.muted" mt={2}>
            Отзывы покупателей о ваших товарах
          </Text>
        </Box>

        {/* Статистика */}
        <HStack gap={6} flexWrap="wrap">
          <Card.Root>
            <Card.Body p={4}>
              <VStack gap={1}>
                <Text fontSize="2xl" fontWeight="bold">
                  {seller.averageRating?.toFixed(1) || '—'}
                </Text>
                {seller.averageRating && <StarRating rating={seller.averageRating} size="sm" />}
                <Text fontSize="sm" color="fg.muted">
                  Средний рейтинг
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>
          <Card.Root>
            <Card.Body p={4}>
              <VStack gap={1}>
                <Text fontSize="2xl" fontWeight="bold">
                  {seller.reviewCount}
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  Всего отзывов
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>
          <Card.Root>
            <Card.Body p={4}>
              <VStack gap={1}>
                <Text fontSize="2xl" fontWeight="bold">
                  {reviews.filter((r) => !r.response).length}
                </Text>
                <Text fontSize="sm" color="fg.muted">
                  Без ответа
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>
        </HStack>

        {/* Таблица отзывов */}
        <Box overflowX="auto">
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Товар</Table.ColumnHeader>
                <Table.ColumnHeader>Покупатель</Table.ColumnHeader>
                <Table.ColumnHeader>Рейтинг</Table.ColumnHeader>
                <Table.ColumnHeader>Отзыв</Table.ColumnHeader>
                <Table.ColumnHeader>Дата</Table.ColumnHeader>
                <Table.ColumnHeader>Ответ</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {reviews.map((r) => (
                <Table.Row key={r.id}>
                  <Table.Cell>
                    <Link asChild fontSize="sm" fontWeight="medium">
                      <NextLink href={`/catalog/${r.product.id}`}>{r.product.name}</NextLink>
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{r.author.name || 'Покупатель'}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <StarRating rating={r.rating} size="sm" />
                  </Table.Cell>
                  <Table.Cell maxW="300px">
                    <Text fontSize="sm" lineClamp={2}>
                      {r.text || '—'}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" color="fg.muted">
                      {new Date(r.createdAt).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </Text>
                  </Table.Cell>
                  <Table.Cell minW="200px">
                    {r.response ? (
                      <VStack align="start" gap={1}>
                        <Text fontSize="sm" lineClamp={2}>
                          {r.response}
                        </Text>
                        <Text fontSize="xs" color="fg.muted">
                          {r.respondedAt &&
                            new Date(r.respondedAt).toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: 'short',
                            })}
                        </Text>
                      </VStack>
                    ) : (
                      <RespondForm reviewId={r.id} />
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>

          {reviews.length === 0 && (
            <Box textAlign="center" py={8}>
              <Text color="fg.muted">Пока нет отзывов</Text>
            </Box>
          )}
        </Box>
      </VStack>
    </Container>
  )
}
