import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Container, Heading, Text, VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { ReturnForm } from './_components/return-form'

interface PageProps {
  params: Promise<{ orderNumber: string }>
}

export default async function ReturnPage({ params }: PageProps) {
  const user = await requireAuth()
  const { orderNumber } = await params
  const db = getEnhancedPrisma(user)

  /** Тип подзаказа с relations */
  type SubOrderWithRelations = {
    id: string
    status: string
    totalAmount: unknown
    seller: { shopName: string }
    items: Array<{
      quantity: number
      price: unknown
      productItem: {
        product: { name: string }
        variant: { color: string } | null
        size: { name: string } | null
      }
    }>
  }

  // Загрузить заказ с подзаказами
  const order = (await (db.order as any).findUnique({
    where: { orderNumber, userId: user.id },
    select: {
      orderNumber: true,
      status: true,
      subOrders: {
        select: {
          id: true,
          status: true,
          totalAmount: true,
          seller: { select: { shopName: true } },
          items: {
            select: {
              quantity: true,
              price: true,
              productItem: {
                select: {
                  product: { select: { name: true } },
                  variant: { select: { color: true } },
                  size: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
  })) as { orderNumber: string; status: string; subOrders: SubOrderWithRelations[] } | null

  if (!order) {
    notFound()
  }

  // Только доставленные подзаказы доступны для возврата
  const deliveredSubOrders = order.subOrders.filter((s) => s.status === 'DELIVERED')

  return (
    <Container maxW="4xl" py={8}>
      <VStack gap={6} align="stretch">
        <Box>
          <Heading size="2xl" textTransform="none">
            Возврат товара
          </Heading>
          <Text color="fg.muted" mt={2}>
            Заказ {order.orderNumber}
          </Text>
        </Box>

        {deliveredSubOrders.length === 0 ? (
          <Box p={8} textAlign="center" borderWidth="1px" borderRadius="lg">
            <Text color="fg.muted">Нет товаров, доступных для возврата.</Text>
            <Text color="fg.muted" fontSize="sm" mt={2}>
              Возврат возможен только для доставленных заказов в течение 7 дней.
            </Text>
          </Box>
        ) : (
          <ReturnForm
            orderNumber={order.orderNumber}
            subOrders={deliveredSubOrders.map((s) => ({
              id: s.id,
              sellerName: s.seller.shopName,
              totalAmount: Number(s.totalAmount),
              items: s.items.map((item) => ({
                productName: item.productItem.product.name,
                variantColor: item.productItem.variant?.color ?? undefined,
                sizeName: item.productItem.size?.name ?? undefined,
                quantity: item.quantity,
                price: Number(item.price),
              })),
            }))}
          />
        )}
      </VStack>
    </Container>
  )
}
