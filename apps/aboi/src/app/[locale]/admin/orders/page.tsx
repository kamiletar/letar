import { Badge, Box, Heading, HStack, Stack, Table, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { prismaAuth } from '@/lib/prisma'

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

const STATUS_LABELS: Record<string, string> = {
  PLACED: 'Принят',
  CONFIRMED: 'Подтв.',
  PAID: 'Оплачен',
  PRINTING: 'Печатается',
  SHIPPED: 'Отгружен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
  REFUNDED: 'Возврат',
}

type StatusFilter = 'active' | 'all' | 'placed' | 'completed' | 'cancelled'

export default async function AdminOrdersListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: StatusFilter }>
}) {
  const { status = 'active' } = await searchParams

  const where = (() => {
    switch (status) {
      case 'placed':
        return { status: 'PLACED' as const }
      case 'completed':
        return { status: 'DELIVERED' as const }
      case 'cancelled':
        return { status: { in: ['CANCELLED', 'REFUNDED'] as Array<'CANCELLED' | 'REFUNDED'> } }
      case 'active':
        return {
          status: {
            in: ['PLACED', 'CONFIRMED', 'PAID', 'PRINTING', 'SHIPPED'] as Array<
              'PLACED' | 'CONFIRMED' | 'PAID' | 'PRINTING' | 'SHIPPED'
            >,
          },
        }
      default:
        return {}
    }
  })()

  const orders = await prismaAuth.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <Stack gap={6}>
      <Heading as="h1" size="2xl">
        Заказы
      </Heading>

      <HStack gap={2} wrap="wrap">
        <FilterPill current={status} value="active" label="Активные" />
        <FilterPill current={status} value="placed" label="Новые" />
        <FilterPill current={status} value="completed" label="Доставленные" />
        <FilterPill current={status} value="cancelled" label="Отменённые" />
        <FilterPill current={status} value="all" label="Все" />
      </HStack>

      {orders.length === 0
        ? (
          <Box p={12} bg="bg.subtle" borderRadius="xl" textAlign="center">
            <Text color="fg.muted">Заказов в этой группе нет</Text>
          </Box>
        )
        : (
          <Table.Root size="md" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Номер</Table.ColumnHeader>
                <Table.ColumnHeader>Дата</Table.ColumnHeader>
                <Table.ColumnHeader>Клиент</Table.ColumnHeader>
                <Table.ColumnHeader>Email / телефон</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Сумма</Table.ColumnHeader>
                <Table.ColumnHeader>Статус</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {orders.map((o) => (
                <Table.Row key={o.id} asChild cursor="pointer" _hover={{ bg: 'bg.subtle' }}>
                  <Link href={`/admin/orders/${o.orderNumber}`}>
                    <Table.Cell fontFamily="mono" fontSize="sm">{o.orderNumber}</Table.Cell>
                    <Table.Cell fontSize="sm">{o.createdAt.toLocaleString('ru-RU')}</Table.Cell>
                    <Table.Cell fontWeight="medium">{o.customerName}</Table.Cell>
                    <Table.Cell fontSize="sm" color="fg.muted">
                      <Stack gap={0}>
                        <Box>{o.customerEmail}</Box>
                        <Box>{o.customerPhone}</Box>
                      </Stack>
                    </Table.Cell>
                    <Table.Cell textAlign="end" fontWeight="semibold">
                      {(o.totalToPay / 100).toFixed(0)} ₽
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={STATUS_COLORS[o.status] ?? 'gray'}>
                        {STATUS_LABELS[o.status] ?? o.status}
                      </Badge>
                    </Table.Cell>
                  </Link>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
    </Stack>
  )
}

function FilterPill({ current, value, label }: { current: string; value: string; label: string }) {
  const active = current === value
  return (
    <Box
      asChild
      px={3}
      py={1.5}
      borderRadius="full"
      borderWidth="1px"
      borderColor={active ? 'brand.solid' : 'border'}
      bg={active ? 'brand.solid' : 'transparent'}
      color={active ? 'white' : 'fg.muted'}
      fontSize="sm"
      _hover={{ borderColor: 'brand.solid' }}
    >
      <Link href={value === 'active' ? '/admin/orders' : `/admin/orders?status=${value}`}>{label}</Link>
    </Box>
  )
}
