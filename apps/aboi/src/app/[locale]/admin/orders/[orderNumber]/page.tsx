import { prismaAuth } from '@/lib/prisma'
import { Badge, Box, Heading, Link, SimpleGrid, Stack, Table, Text } from '@chakra-ui/react'
import { notFound } from 'next/navigation'
import { ALLOWED_ORDER_TRANSITIONS } from '../../_actions/orders-status-config'
import { OrderControls } from './_components/order-controls'

const STATUS_LABELS: Record<string, string> = {
  PLACED: 'Принят',
  CONFIRMED: 'Подтверждён',
  PAID: 'Оплачен',
  PRINTING: 'В печати',
  SHIPPED: 'Отгружен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
  REFUNDED: 'Возврат',
}

const STATUS_COLORS: Record<string, string> = {
  PLACED: 'blue',
  CONFIRMED: 'cyan',
  PAID: 'teal',
  PRINTING: 'purple',
  SHIPPED: 'orange',
  DELIVERED: 'green',
  CANCELLED: 'red',
  REFUNDED: 'gray',
}

interface AddressSnapshot {
  country?: string
  region?: string
  city?: string
  street?: string
  building?: string
  apartment?: string
  postalCode?: string
  fullAddress?: string
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params
  const order = await prismaAuth.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  })
  if (!order) notFound()

  const address = order.shippingAddressSnapshot as unknown as AddressSnapshot

  return (
    <Stack gap={6}>
      <Stack gap={2}>
        <Heading as="h1" size="2xl">
          Заказ {order.orderNumber}
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          {order.createdAt.toLocaleString('ru-RU')}
        </Text>
        <Box>
          <Badge colorPalette={STATUS_COLORS[order.status] ?? 'gray'} fontSize="md">
            {STATUS_LABELS[order.status] ?? order.status}
          </Badge>
        </Box>
      </Stack>

      <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
        <Stack gap={2} p={5} bg="bg.surface" borderRadius="xl" borderWidth="1px" borderColor="border">
          <Text fontSize="sm" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider">
            Клиент
          </Text>
          <Text fontWeight="medium">{order.customerName}</Text>
          <Text fontSize="sm">{order.customerEmail}</Text>
          <Text fontSize="sm">{order.customerPhone}</Text>
        </Stack>
        <Stack gap={1} p={5} bg="bg.surface" borderRadius="xl" borderWidth="1px" borderColor="border">
          <Text fontSize="sm" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider">
            Доставка
          </Text>
          <Text fontWeight="medium">
            {order.shippingMethod === 'CDEK_POINT' && 'СДЭК до пункта выдачи'}
            {order.shippingMethod === 'CDEK_DOOR' && 'СДЭК курьером'}
            {order.shippingMethod === 'MANAGER_CALL' && 'Согласовать с менеджером'}
          </Text>
          {address.fullAddress && <Text fontSize="sm">{address.fullAddress}</Text>}
          {!address.fullAddress && (
            <Text fontSize="sm">
              {[address.country, address.region, address.city, address.street, address.building, address.apartment]
                .filter(Boolean)
                .join(', ')}
              {address.postalCode ? ` · ${address.postalCode}` : null}
            </Text>
          )}
          {order.shippingCost > 0 && (
            <Text fontSize="sm">
              <strong>Стоимость доставки:</strong> {(order.shippingCost / 100).toFixed(0)} ₽
            </Text>
          )}
          {order.pvzCode && (
            <Text fontSize="sm">
              <strong>Код ПВЗ:</strong> {order.pvzCode}
            </Text>
          )}
          {order.cdekOrderUuid && (
            <Text fontSize="sm" fontFamily="mono">
              <strong>СДЭК UUID:</strong> {order.cdekOrderUuid}
            </Text>
          )}
          {order.trackingNumber && (
            <Text fontSize="sm">
              <strong>Трек:</strong>{' '}
              <Link
                href={`https://www.cdek.ru/ru/tracking/?order_id=${order.trackingNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                color="blue.fg"
                textDecoration="underline"
              >
                {order.trackingNumber}
              </Link>
            </Text>
          )}
        </Stack>
      </SimpleGrid>

      <Box>
        <Text
          fontSize="sm"
          fontWeight="semibold"
          color="fg.muted"
          textTransform="uppercase"
          letterSpacing="wider"
          mb={2}
        >
          Позиции
        </Text>
        <Table.Root size="sm" variant="outline">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Товар</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Длина</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Цена/м</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="end">Итого</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {order.items.map((it) => (
              <Table.Row key={it.id}>
                <Table.Cell>{it.productNameSnapshot}</Table.Cell>
                <Table.Cell textAlign="end">{Number(it.lengthMeters).toFixed(2)} м</Table.Cell>
                <Table.Cell textAlign="end">{(it.unitPrice / 100).toFixed(0)} ₽</Table.Cell>
                <Table.Cell textAlign="end" fontWeight="semibold">
                  {(it.total / 100).toFixed(0)} ₽
                </Table.Cell>
              </Table.Row>
            ))}
            {order.shippingCost > 0 && (
              <Table.Row>
                <Table.Cell colSpan={3} textAlign="end" color="fg.muted">
                  Доставка СДЭК:
                </Table.Cell>
                <Table.Cell textAlign="end">{(order.shippingCost / 100).toFixed(0)} ₽</Table.Cell>
              </Table.Row>
            )}
            <Table.Row>
              <Table.Cell colSpan={3} textAlign="end" fontWeight="semibold">
                Итого:
              </Table.Cell>
              <Table.Cell textAlign="end" fontWeight="bold">
                {(order.totalToPay / 100).toFixed(0)} ₽
              </Table.Cell>
            </Table.Row>
          </Table.Body>
        </Table.Root>
      </Box>

      {order.customerNotes && (
        <Box p={4} bg="bg.subtle" borderRadius="md">
          <Text fontSize="sm" fontWeight="semibold" color="fg.muted">
            Комментарий клиента
          </Text>
          <Text fontSize="sm">{order.customerNotes}</Text>
        </Box>
      )}

      <OrderControls
        orderId={order.id}
        currentStatus={order.status}
        allowedNext={
          (ALLOWED_ORDER_TRANSITIONS[order.status as keyof typeof ALLOWED_ORDER_TRANSITIONS] ?? []) as string[]
        }
        trackingNumber={order.trackingNumber ?? ''}
        internalNotes={order.internalNotes ?? ''}
      />
    </Stack>
  )
}
