import { requireSeller } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Heading, HStack, Table, Text, VStack } from '@chakra-ui/react'
import { ReturnStatusBadge } from '../../admin/returns/_components/return-status-badge'

/** Тип возврата с relations для продавца */
type SellerReturnRow = {
  id: string
  status: string
  reason: string
  refundAmount: unknown
  createdAt: Date
  subOrder: {
    id: string
    totalAmount: unknown
    order: {
      orderNumber: string
      customerName: string
    }
    items: Array<{
      productItem: {
        product: { name: string }
      }
    }>
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export default async function SellerReturnsPage() {
  const user = await requireSeller()
  const db = getEnhancedPrisma(user)

  // Найти Seller текущего пользователя
  const seller = await db.seller.findUnique({
    where: { userId: user.id },
    select: { id: true },
  })

  if (!seller) {
    return (
      <Box p={8} textAlign="center">
        <Text color="fg.muted">Профиль продавца не найден</Text>
      </Box>
    )
  }

  // Загрузить возвраты по подзаказам этого продавца
  const [requestedCount, returns] = await Promise.all([
    db.return.count({
      where: {
        subOrder: { sellerId: seller.id },
        status: 'REQUESTED' as never,
      },
    }),
    (db.return as any).findMany({
      where: {
        subOrder: { sellerId: seller.id },
      },
      include: {
        subOrder: {
          include: {
            order: { select: { orderNumber: true, customerName: true } },
            items: {
              include: {
                productItem: {
                  include: {
                    product: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as SellerReturnRow[],
  ])

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <HStack justify="space-between" align="center">
          <Heading size="xl" textTransform="none">
            Возвраты
          </Heading>
          {requestedCount > 0 && (
            <Badge colorPalette="red" fontSize="sm" px={2}>
              {requestedCount} новых
            </Badge>
          )}
        </HStack>
        <Text color="fg.muted" mt={1}>
          Запросы на возврат от покупателей
        </Text>
      </Box>

      {returns.length === 0 ? (
        <Box p={8} textAlign="center" borderWidth="1px" borderRadius="lg">
          <Text color="fg.muted">Нет запросов на возврат</Text>
        </Box>
      ) : (
        <Box overflowX="auto">
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Заказ</Table.ColumnHeader>
                <Table.ColumnHeader>Статус</Table.ColumnHeader>
                <Table.ColumnHeader>Покупатель</Table.ColumnHeader>
                <Table.ColumnHeader>Товар</Table.ColumnHeader>
                <Table.ColumnHeader>Причина</Table.ColumnHeader>
                <Table.ColumnHeader>Сумма</Table.ColumnHeader>
                <Table.ColumnHeader>Дата</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {returns.map((r) => (
                <Table.Row key={r.id}>
                  <Table.Cell>
                    <Text fontSize="sm" fontFamily="mono" fontWeight="medium">
                      {r.subOrder.order.orderNumber}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <ReturnStatusBadge status={r.status} />
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{r.subOrder.order.customerName}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <VStack align="start" gap={0}>
                      {r.subOrder.items.slice(0, 2).map((item, i) => (
                        <Text key={i} fontSize="sm" lineClamp={1}>
                          {item.productItem.product.name}
                        </Text>
                      ))}
                      {r.subOrder.items.length > 2 && (
                        <Text fontSize="xs" color="fg.muted">
                          +{r.subOrder.items.length - 2} ещё
                        </Text>
                      )}
                    </VStack>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" lineClamp={1} maxW="200px">
                      {r.reason}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" fontWeight="medium">
                      {r.refundAmount
                        ? formatPrice(Number(r.refundAmount))
                        : formatPrice(Number(r.subOrder.totalAmount))}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" color="fg.muted">
                      {new Date(r.createdAt).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </VStack>
  )
}
