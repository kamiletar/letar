import { requireSeller } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Card, Heading, HStack, Table, Text, VStack } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { SubOrderStatusBadge } from '../_components/sub-order-status-badge'
import { ShippingForm } from './shipping-form'

/**
 * Детали подзаказа продавца.
 */
export default async function SellerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireSeller()
  const db = getEnhancedPrisma(user)
  const { id } = await params

  const subOrder = await db.subOrder.findUnique({
    where: { id },
    include: {
      order: true,
      items: true,
    },
  })

  if (!subOrder) {
    notFound()
  }

  const canShip = subOrder.status === 'PAID' || subOrder.status === 'PROCESSING'

  return (
    <VStack gap={6} align="stretch">
      <HStack justify="space-between" flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="xl">Подзаказ {subOrder.subOrderNumber}</Heading>
          <Text color="fg.muted">Заказ: {subOrder.order.orderNumber}</Text>
        </Box>
        <SubOrderStatusBadge status={subOrder.status} />
      </HStack>

      {/* Покупатель */}
      <Card.Root>
        <Card.Header>
          <Heading size="md">Покупатель</Heading>
        </Card.Header>
        <Card.Body>
          <VStack align="stretch" gap={2}>
            <HStack justify="space-between">
              <Text color="fg.muted">Имя</Text>
              <Text>{subOrder.order.customerName || '—'}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="fg.muted">Email</Text>
              <Text>{subOrder.order.customerEmail || '—'}</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="fg.muted">Телефон</Text>
              <Text>{subOrder.order.customerPhone || '—'}</Text>
            </HStack>
            {subOrder.order.deliveryAddress && (
              <HStack justify="space-between">
                <Text color="fg.muted">Адрес</Text>
                <Text textAlign="right">{subOrder.order.deliveryAddress}</Text>
              </HStack>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Товары */}
      <Card.Root>
        <Card.Header>
          <Heading size="md">Товары</Heading>
        </Card.Header>
        <Card.Body p={0}>
          <Table.Root size="sm">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Товар</Table.ColumnHeader>
                <Table.ColumnHeader>Цвет</Table.ColumnHeader>
                <Table.ColumnHeader>Размер</Table.ColumnHeader>
                <Table.ColumnHeader>Кол-во</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="right">Цена</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {subOrder.items.map((item) => (
                <Table.Row key={item.id}>
                  <Table.Cell fontWeight="medium">{item.productName}</Table.Cell>
                  <Table.Cell>{item.variantColor}</Table.Cell>
                  <Table.Cell>{item.sizeName}</Table.Cell>
                  <Table.Cell>{item.quantity}</Table.Cell>
                  <Table.Cell textAlign="right">{Number(item.price).toLocaleString('ru-RU')} ₽</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Card.Body>
      </Card.Root>

      {/* Финансы */}
      <Card.Root>
        <Card.Header>
          <Heading size="md">Финансы</Heading>
        </Card.Header>
        <Card.Body>
          <VStack align="stretch" gap={2}>
            <HStack justify="space-between">
              <Text color="fg.muted">Сумма товаров</Text>
              <Text>{Number(subOrder.subtotal).toLocaleString('ru-RU')} ₽</Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="fg.muted">Комиссия ({(Number(subOrder.commissionRate) * 100).toFixed(1)}%)</Text>
              <Text color="red.500">−{Number(subOrder.commissionAmount).toLocaleString('ru-RU')} ₽</Text>
            </HStack>
            <HStack justify="space-between" fontWeight="bold" pt={2} borderTopWidth="1px">
              <Text>К выплате</Text>
              <Text color="green.600">{Number(subOrder.sellerAmount).toLocaleString('ru-RU')} ₽</Text>
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Доставка и форма отправки */}
      <Card.Root>
        <Card.Header>
          <Heading size="md">Доставка</Heading>
        </Card.Header>
        <Card.Body>
          {subOrder.trackingNumber ? (
            <VStack align="stretch" gap={2}>
              <HStack justify="space-between">
                <Text color="fg.muted">Трек-номер</Text>
                <Text fontWeight="medium">{subOrder.trackingNumber}</Text>
              </HStack>
              {subOrder.shippedAt && (
                <HStack justify="space-between">
                  <Text color="fg.muted">Отправлен</Text>
                  <Text>{new Date(subOrder.shippedAt).toLocaleDateString('ru-RU')}</Text>
                </HStack>
              )}
              {subOrder.deliveredAt && (
                <HStack justify="space-between">
                  <Text color="fg.muted">Доставлен</Text>
                  <Text>{new Date(subOrder.deliveredAt).toLocaleDateString('ru-RU')}</Text>
                </HStack>
              )}
            </VStack>
          ) : canShip ? (
            <ShippingForm subOrderId={subOrder.id} />
          ) : (
            <Text color="fg.muted">Трек-номер будет доступен после оплаты</Text>
          )}
        </Card.Body>
      </Card.Root>
    </VStack>
  )
}
