import { Badge, Box, Container, Heading, Stack, Table, Text } from '@chakra-ui/react'
import Link from 'next/link'
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

export default async function MyOrdersPage() {
  const user = await requireAuth()
  const orders = await prismaAuth.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <Container maxW="5xl" py={{ base: 8, md: 12 }}>
      <Stack gap={6}>
        <Heading as="h1" size="3xl">
          Мои заказы
        </Heading>

        {orders.length === 0
          ? (
            <Box p={12} bg="bg.subtle" borderRadius="xl" textAlign="center">
              <Text color="fg.muted">Заказов пока нет.</Text>
              <Box asChild color="brand.solid" mt={2} _hover={{ textDecoration: 'underline' }}>
                <Link href="/catalog">Перейти в каталог →</Link>
              </Box>
            </Box>
          )
          : (
            <Table.Root size="md" variant="outline">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Номер</Table.ColumnHeader>
                  <Table.ColumnHeader>Дата</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Сумма</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {orders.map((o) => (
                  <Table.Row key={o.id} asChild cursor="pointer" _hover={{ bg: 'bg.subtle' }}>
                    <Link href={`/profile/orders/${o.orderNumber}`}>
                      <Table.Cell fontFamily="mono" fontSize="sm">{o.orderNumber}</Table.Cell>
                      <Table.Cell fontSize="sm">{o.createdAt.toLocaleString('ru-RU')}</Table.Cell>
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
    </Container>
  )
}
