import { Link } from '@/i18n/navigation'
import { requireSeller } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Card, Heading, Table, Text, VStack } from '@chakra-ui/react'
import { SubOrderStatusBadge } from './_components/sub-order-status-badge'

interface SearchParams {
  status?: string
}

/**
 * Список заказов (SubOrders) продавца.
 */
export default async function SellerOrdersPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireSeller()
  const db = getEnhancedPrisma(user)
  const params = await searchParams

  const seller = await db.seller.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })

  if (!seller) {
    return <Text>Профиль продавца не найден.</Text>
  }

  const where = {
    sellerId: seller.id,
    ...(params.status ? { status: params.status as never } : {}),
  }

  const subOrders = await db.subOrder.findMany({
    where,
    include: {
      order: true,
      items: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading size="xl">Мои заказы</Heading>
        <Text color="fg.muted">{subOrders.length} заказов</Text>
      </Box>

      {subOrders.length === 0 ? (
        <Card.Root>
          <Card.Body>
            <VStack py={8}>
              <Text color="fg.muted">Заказов пока нет</Text>
              <Text fontSize="sm" color="fg.muted">
                Заказы появятся, когда покупатели оформят заказ с вашими товарами
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      ) : (
        <Card.Root>
          <Card.Body p={0}>
            <Table.Root size="sm" interactive>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Подзаказ</Table.ColumnHeader>
                  <Table.ColumnHeader>Покупатель</Table.ColumnHeader>
                  <Table.ColumnHeader>Сумма</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                  <Table.ColumnHeader>Дата</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {subOrders.map((subOrder) => (
                  <Table.Row key={subOrder.id} asChild>
                    <Link href={`/seller/orders/${subOrder.id}`}>
                      <Table.Cell fontWeight="medium">{subOrder.subOrderNumber}</Table.Cell>
                      <Table.Cell>{subOrder.order.customerName || subOrder.order.customerEmail || '—'}</Table.Cell>
                      <Table.Cell>{Number(subOrder.sellerAmount).toLocaleString('ru-RU')} ₽</Table.Cell>
                      <Table.Cell>
                        <SubOrderStatusBadge status={subOrder.status} />
                      </Table.Cell>
                      <Table.Cell>{new Date(subOrder.createdAt).toLocaleDateString('ru-RU')}</Table.Cell>
                    </Link>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card.Body>
        </Card.Root>
      )}
    </VStack>
  )
}
