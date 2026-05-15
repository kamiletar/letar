import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { ReviewForm } from './_components/review-form'

interface PageProps {
  params: Promise<{ orderNumber: string }>
}

export default async function ReviewPage({ params }: PageProps) {
  const user = await requireAuth()
  const { orderNumber } = await params
  const db = getEnhancedPrisma(user)

  // Загрузить заказ с подзаказами
  const order = (await (db.order as any).findUnique({
    where: { orderNumber, userId: user.id },
    select: {
      orderNumber: true,
      subOrders: {
        where: { status: { in: ['DELIVERED', 'COMPLETED'] } },
        select: {
          items: {
            select: {
              productItemId: true,
              productName: true,
              variantColor: true,
            },
          },
        },
      },
    },
  })) as {
    orderNumber: string
    subOrders: Array<{
      items: Array<{
        productItemId: string
        productName: string
        variantColor: string
      }>
    }>
  } | null

  if (!order) {
    notFound()
  }

  // Собрать уникальные productItemId → productId
  const productItemIds = order.subOrders.flatMap((s) => s.items.map((i) => i.productItemId))

  // Получить product ID для каждого productItem
  const productItems = await (db.productItem as any).findMany({
    where: { id: { in: productItemIds } },
    select: { id: true, variant: { select: { productId: true, product: { select: { name: true } } } } },
  })

  // Проверить какие товары уже имеют отзыв от юзера
  const productIds = [...new Set(productItems.map((pi: { variant: { productId: string } }) => pi.variant.productId))]
  const existingReviews = await (db.review as any).findMany({
    where: { authorId: user.id, productId: { in: productIds } },
    select: { productId: true },
  })
  const reviewedProductIds = new Set(existingReviews.map((r: { productId: string }) => r.productId))

  // Товары, доступные для отзыва (ещё не оценены)
  const availableProducts = productItems
    .filter((pi: { variant: { productId: string } }) => !reviewedProductIds.has(pi.variant.productId))
    .map((pi: { variant: { productId: string; product: { name: string } } }) => ({
      productId: pi.variant.productId,
      productName: pi.variant.product.name,
    }))

  // Дедупликация по productId
  const uniqueProducts = Array.from(
    new Map(availableProducts.map((p: { productId: string; productName: string }) => [p.productId, p])).values()
  ) as Array<{ productId: string; productName: string }>

  return (
    <Container maxW="4xl" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Heading size="2xl" textTransform="none">
            Оставить отзыв
          </Heading>
          <Text color="fg.muted" mt={2}>
            Заказ {order.orderNumber}
          </Text>
        </Box>

        {uniqueProducts.length === 0 ? (
          <Box p={8} textAlign="center" borderWidth="1px" borderRadius="lg">
            <Text color="fg.muted">Все товары из этого заказа уже оценены.</Text>
          </Box>
        ) : (
          <ReviewForm orderNumber={order.orderNumber} products={uniqueProducts} />
        )}
      </VStack>
    </Container>
  )
}
