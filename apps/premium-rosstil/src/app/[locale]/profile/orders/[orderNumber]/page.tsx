import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Card, Container, Heading, HStack, Separator, Table, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { notFound } from 'next/navigation'
import { OrderStatusBadge } from '../_components/order-status-badge'

interface PageProps {
  params: Promise<{ orderNumber: string }>
}

export default async function OrderDetailPage({ params }: PageProps) {
  // Проверка авторизации
  const authUser = await requireAuth()

  // Получение параметров (async в Next.js 16)
  const { orderNumber } = await params

  // Получение заказа
  const db = getEnhancedPrisma(authUser)
  const order = await db.order.findUnique({
    where: {
      orderNumber,
      userId: authUser.id, // Проверяем, что заказ принадлежит пользователю
    },
    include: {
      items: true,
    },
  })

  if (!order) {
    notFound()
  }

  // Конвертируем в число для правильного форматирования (работает с number, string, Decimal)
  const totalAmount = Number(order.totalAmount)

  return (
    <Container maxW="7xl" py={8}>
      {/* Заголовок с номером заказа и статусом */}
      <HStack justify="space-between" align="start" mb={8}>
        <VStack align="start" gap={2}>
          <Heading size="3xl" textTransform="none">
            Заказ {order.orderNumber}
          </Heading>
          <Text fontSize="lg" color="fg.muted">
            {order.createdAt.toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </VStack>

        <OrderStatusBadge status={order.status} />
      </HStack>

      <VStack align="stretch" gap={6}>
        {/* Информация о покупателе */}
        <Card.Root>
          <Card.Header>
            <Heading size="lg" textTransform="none">
              Данные покупателя
            </Heading>
          </Card.Header>
          <Card.Body>
            <VStack align="stretch" gap={3}>
              <Box>
                <Text fontSize="sm" color="fg.muted" mb={1}>
                  Имя
                </Text>
                <Text fontWeight="medium">{order.customerName}</Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="fg.muted" mb={1}>
                  Телефон
                </Text>
                <Text fontWeight="medium">{order.customerPhone}</Text>
              </Box>
              {order.customerEmail && (
                <Box>
                  <Text fontSize="sm" color="fg.muted" mb={1}>
                    Email
                  </Text>
                  <Text fontWeight="medium">{order.customerEmail}</Text>
                </Box>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Адрес доставки */}
        <Card.Root>
          <Card.Header>
            <Heading size="lg" textTransform="none">
              Адрес доставки
            </Heading>
          </Card.Header>
          <Card.Body>
            <VStack align="stretch" gap={2}>
              <Text fontWeight="medium">{order.deliveryAddress}</Text>
              {(order.deliveryCity || order.deliveryRegion || order.deliveryPostalCode) && (
                <Text color="fg.muted">
                  {[order.deliveryCity, order.deliveryRegion, order.deliveryPostalCode].filter(Boolean).join(', ')}
                </Text>
              )}
              {order.deliveryCountry && <Text color="fg.muted">{order.deliveryCountry}</Text>}
            </VStack>
          </Card.Body>
        </Card.Root>

        {/* Список товаров */}
        <Card.Root>
          <Card.Header>
            <Heading size="lg" textTransform="none">
              Состав заказа
            </Heading>
          </Card.Header>
          <Card.Body>
            <Table.Root variant="outline">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Товар</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="center">Количество</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Цена</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Сумма</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {order.items.map((item: (typeof order.items)[number]) => {
                  // Конвертируем в число для правильного форматирования (работает с number, string, Decimal)
                  const itemPrice = Number(item.price)
                  const itemTotal = itemPrice * item.quantity

                  return (
                    <Table.Row key={item.id}>
                      <Table.Cell>
                        <VStack align="start" gap={1}>
                          <Text fontWeight="medium">{item.productName}</Text>
                          <Text fontSize="sm" color="fg.muted">
                            {item.variantColor}, размер {item.sizeName}
                          </Text>
                        </VStack>
                      </Table.Cell>
                      <Table.Cell textAlign="center">{item.quantity}</Table.Cell>
                      <Table.Cell textAlign="right">
                        {itemPrice.toLocaleString('ru-RU', {
                          style: 'currency',
                          currency: 'RUB',
                        })}
                      </Table.Cell>
                      <Table.Cell textAlign="right" fontWeight="medium">
                        {itemTotal.toLocaleString('ru-RU', {
                          style: 'currency',
                          currency: 'RUB',
                        })}
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Root>

            <Separator my={4} />

            {/* Итоговая сумма */}
            <HStack justify="flex-end">
              <Text fontSize="xl" fontWeight="semibold">
                Итого:
              </Text>
              <Text fontSize="2xl" fontWeight="bold" color="fg">
                {totalAmount.toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                })}
              </Text>
            </HStack>
          </Card.Body>
        </Card.Root>

        {/* Действия для доставленных заказов */}
        {order.status === 'DELIVERED' && (
          <HStack gap={4} flexWrap="wrap">
            <Button asChild colorPalette="fg" size="lg">
              <NextLink href={`/profile/orders/${order.orderNumber}/review`}>Оставить отзыв</NextLink>
            </Button>
            <Button asChild variant="outline" colorPalette="red" size="lg">
              <NextLink href={`/profile/orders/${order.orderNumber}/return`}>Оформить возврат</NextLink>
            </Button>
          </HStack>
        )}

        {/* Заметки к заказу */}
        {order.notes && (
          <Card.Root>
            <Card.Header>
              <Heading size="lg" textTransform="none">
                Комментарий к заказу
              </Heading>
            </Card.Header>
            <Card.Body>
              <Text>{order.notes}</Text>
            </Card.Body>
          </Card.Root>
        )}
      </VStack>
    </Container>
  )
}
