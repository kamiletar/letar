import { Badge, Box, Container, Heading, SimpleGrid, Stack, Table, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth-utils'
import { prismaAuth } from '@/lib/prisma'

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
  fullAddress?: string
  country?: string
  region?: string
  city?: string
  street?: string
  building?: string
  apartment?: string
  postalCode?: string
}

export default async function MyOrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const user = await requireAuth()
  const { orderNumber } = await params

  const order = await prismaAuth.order.findUnique({
    where: { orderNumber },
    include: { items: true },
  })
  if (!order || order.userId !== user.id) notFound()

  const address = order.shippingAddressSnapshot as unknown as AddressSnapshot

  return (
    <Container maxW="3xl" py={{ base: 8, md: 12 }}>
      <Stack gap={6}>
        <Box>
          <Box asChild color="fg.muted" fontSize="sm" _hover={{ color: 'brand.solid' }}>
            <Link href="/profile/orders">← Все заказы</Link>
          </Box>
        </Box>

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

        <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
          <Stack gap={1} p={4} bg="bg.surface" borderRadius="md" borderWidth="1px" borderColor="border">
            <Text fontSize="xs" color="fg.muted" textTransform="uppercase">Доставка</Text>
            <Text fontSize="sm" fontWeight="medium">
              {order.shippingMethod === 'CDEK_POINT' && 'СДЭК до пункта выдачи'}
              {order.shippingMethod === 'CDEK_DOOR' && 'СДЭК курьером'}
              {order.shippingMethod === 'MANAGER_CALL' && 'Согласовать с менеджером'}
            </Text>
            <Text fontSize="sm">
              {address.fullAddress ?? [address.country, address.region, address.city, address.street, address.building]
                .filter(Boolean)
                .join(', ')}
            </Text>
            {order.trackingNumber && (
              <Text fontSize="sm">
                <strong>Трек:</strong> {order.trackingNumber}
              </Text>
            )}
          </Stack>
          <Stack gap={1} p={4} bg="bg.surface" borderRadius="md" borderWidth="1px" borderColor="border">
            <Text fontSize="xs" color="fg.muted" textTransform="uppercase">Контакты</Text>
            <Text fontSize="sm">{order.customerName}</Text>
            <Text fontSize="sm">{order.customerEmail}</Text>
            <Text fontSize="sm">{order.customerPhone}</Text>
          </Stack>
        </SimpleGrid>

        <Box>
          <Text fontSize="sm" fontWeight="semibold" color="fg.muted" textTransform="uppercase" mb={2}>
            Позиции
          </Text>
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Товар</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Длина</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Итого</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {order.items.map((it) => (
                <Table.Row key={it.id}>
                  <Table.Cell>{it.productNameSnapshot}</Table.Cell>
                  <Table.Cell textAlign="end">{Number(it.lengthMeters).toFixed(2)} м</Table.Cell>
                  <Table.Cell textAlign="end" fontWeight="semibold">{(it.total / 100).toFixed(0)} ₽</Table.Cell>
                </Table.Row>
              ))}
              <Table.Row>
                <Table.Cell colSpan={2} textAlign="end" fontWeight="semibold">Итого:</Table.Cell>
                <Table.Cell textAlign="end" fontWeight="bold">
                  {(order.totalToPay / 100).toFixed(0)} ₽
                </Table.Cell>
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </Box>

        {order.customerNotes && (
          <Box p={4} bg="bg.subtle" borderRadius="md">
            <Text fontSize="sm" fontWeight="semibold" color="fg.muted">Ваш комментарий</Text>
            <Text fontSize="sm">{order.customerNotes}</Text>
          </Box>
        )}
      </Stack>
    </Container>
  )
}
