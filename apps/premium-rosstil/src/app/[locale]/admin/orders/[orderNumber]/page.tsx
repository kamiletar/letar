import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import {
  Box,
  Card,
  Container,
  Grid,
  GridItem,
  Heading,
  HStack,
  Link,
  Separator,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { notFound } from 'next/navigation'
import { updateOrder } from '../_actions/update-order'
import { OrderEditForm } from '../_components/order-edit-form'
import { OrderStatusBadge } from '../_components/order-status-badge'

interface PageProps {
  params: Promise<{ orderNumber: string }>
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const user = await requireAdmin()
  const { orderNumber } = await params
  const db = getEnhancedPrisma(user)

  const order = await db.order.findUnique({
    where: { orderNumber },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: {
            select: { phoneNumber: true },
          },
        },
      },
      items: true,
    },
  })

  if (!order) {
    notFound()
  }

  const updateAction = updateOrder.bind(null, order.id)

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Header */}
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin/orders">← Вернуться к списку заказов</NextLink>
          </Link>
          <HStack justifyContent="space-between" alignItems="center" mb={2}>
            <Heading size="2xl" textTransform="none">
              Заказ #{order.orderNumber}
            </Heading>
            <OrderStatusBadge status={order.status} />
          </HStack>
          <Text color="fg.muted">
            Создан:{' '}
            {new Date(order.createdAt).toLocaleDateString('ru-RU', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </Box>

        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={6}>
          {/* Main info */}
          <GridItem>
            <VStack gap={6} align="stretch">
              {/* Customer info */}
              <Card.Root>
                <Card.Header>
                  <Card.Title>Покупатель</Card.Title>
                </Card.Header>
                <Card.Body>
                  <VStack align="stretch" gap={3}>
                    <HStack justifyContent="space-between">
                      <Text color="fg.muted">Имя:</Text>
                      <Text fontWeight="medium">{order.customerName}</Text>
                    </HStack>
                    <HStack justifyContent="space-between">
                      <Text color="fg.muted">Телефон:</Text>
                      <Link href={`tel:${order.customerPhone}`} color="fg.info">
                        {order.customerPhone}
                      </Link>
                    </HStack>
                    {order.customerEmail && (
                      <HStack justifyContent="space-between">
                        <Text color="fg.muted">Email:</Text>
                        <Link href={`mailto:${order.customerEmail}`} color="fg.info">
                          {order.customerEmail}
                        </Link>
                      </HStack>
                    )}
                    <Separator />
                    <HStack justifyContent="space-between">
                      <Text color="fg.muted">Пользователь:</Text>
                      <VStack align="end" gap={0}>
                        <Text fontSize="sm">{order.user.name || 'Без имени'}</Text>
                        <Text fontSize="xs" color="fg.muted">
                          {order.user.email}
                        </Text>
                      </VStack>
                    </HStack>
                  </VStack>
                </Card.Body>
              </Card.Root>

              {/* Delivery info */}
              <Card.Root>
                <Card.Header>
                  <Card.Title>Доставка</Card.Title>
                </Card.Header>
                <Card.Body>
                  <VStack align="stretch" gap={3}>
                    <Box>
                      <Text color="fg.muted" fontSize="sm" mb={1}>
                        Адрес доставки
                      </Text>
                      <Text fontWeight="medium">{order.deliveryAddress}</Text>
                    </Box>
                    {(order.deliveryCity || order.deliveryRegion || order.deliveryPostalCode) && (
                      <HStack gap={4} flexWrap="wrap">
                        {order.deliveryCity && (
                          <Box>
                            <Text color="fg.muted" fontSize="xs">
                              Город
                            </Text>
                            <Text fontSize="sm">{order.deliveryCity}</Text>
                          </Box>
                        )}
                        {order.deliveryRegion && (
                          <Box>
                            <Text color="fg.muted" fontSize="xs">
                              Регион
                            </Text>
                            <Text fontSize="sm">{order.deliveryRegion}</Text>
                          </Box>
                        )}
                        {order.deliveryPostalCode && (
                          <Box>
                            <Text color="fg.muted" fontSize="xs">
                              Индекс
                            </Text>
                            <Text fontSize="sm">{order.deliveryPostalCode}</Text>
                          </Box>
                        )}
                      </HStack>
                    )}
                  </VStack>
                </Card.Body>
              </Card.Root>

              {/* Order items */}
              <Card.Root>
                <Card.Header>
                  <Card.Title>Товары в заказе</Card.Title>
                </Card.Header>
                <Card.Body p={0}>
                  <Table.Root size="sm">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Товар</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="center">Кол-во</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">Цена</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">Сумма</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {order.items.map((item: (typeof order.items)[number]) => (
                        <Table.Row key={item.id}>
                          <Table.Cell>
                            <VStack align="start" gap={0}>
                              <Text fontWeight="medium">{item.productName}</Text>
                              <HStack gap={2}>
                                {item.variantColor && (
                                  <Text fontSize="xs" color="fg.muted">
                                    Цвет: {item.variantColor}
                                  </Text>
                                )}
                                {item.sizeName && (
                                  <Text fontSize="xs" color="fg.muted">
                                    Размер: {item.sizeName}
                                  </Text>
                                )}
                              </HStack>
                            </VStack>
                          </Table.Cell>
                          <Table.Cell textAlign="center">{item.quantity}</Table.Cell>
                          <Table.Cell textAlign="right">{formatPrice(Number(item.price))}</Table.Cell>
                          <Table.Cell textAlign="right" fontWeight="medium">
                            {formatPrice(Number(item.price) * item.quantity)}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                    <Table.Footer>
                      <Table.Row>
                        <Table.Cell colSpan={3} textAlign="right" fontWeight="bold">
                          Итого:
                        </Table.Cell>
                        <Table.Cell textAlign="right" fontWeight="bold" fontSize="lg" color="fg.info">
                          {formatPrice(Number(order.totalAmount))}
                        </Table.Cell>
                      </Table.Row>
                    </Table.Footer>
                  </Table.Root>
                </Card.Body>
              </Card.Root>

              {/* Customer notes */}
              {order.notes && (
                <Card.Root>
                  <Card.Header>
                    <Card.Title>Комментарий покупателя</Card.Title>
                  </Card.Header>
                  <Card.Body>
                    <Text whiteSpace="pre-wrap">{order.notes}</Text>
                  </Card.Body>
                </Card.Root>
              )}
            </VStack>
          </GridItem>

          {/* Sidebar - Edit form */}
          <GridItem>
            <Card.Root position="sticky" top={4}>
              <Card.Header>
                <Card.Title>Управление заказом</Card.Title>
              </Card.Header>
              <Card.Body>
                <OrderEditForm
                  action={updateAction}
                  defaultValue={{
                    status: order.status,
                    adminNotes: order.adminNotes || undefined,
                  }}
                />
              </Card.Body>
            </Card.Root>
          </GridItem>
        </Grid>
      </VStack>
    </Container>
  )
}
