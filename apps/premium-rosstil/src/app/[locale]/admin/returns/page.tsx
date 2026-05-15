import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Button, Container, Heading, HStack, Link, Table, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { RETURN_STATUS_LABELS, ReturnStatusBadge } from './_components/return-status-badge'

/** Тип возврата с relations */
type ReturnWithRelations = {
  id: string
  status: string
  reason: string
  refundAmount: unknown
  createdAt: Date
  reviewedAt: Date | null
  subOrder: {
    id: string
    totalAmount: unknown
    seller: { shopName: string }
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

interface PageProps {
  searchParams: Promise<{
    status?: string
  }>
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export default async function AdminReturnsPage({ searchParams }: PageProps) {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  const params = await searchParams
  const statusFilter = params.status

  // Фильтр по статусу
  const where: Record<string, unknown> = {}
  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter as never
  }

  // Параллельная загрузка данных
  const [totalCount, requestedCount, returns] = await Promise.all([
    db.return.count(),
    db.return.count({ where: { status: 'REQUESTED' as never } }),
    (db.return as any).findMany({
      where: where as never,
      include: {
        subOrder: {
          include: {
            seller: { select: { shopName: true } },
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
    }) as ReturnWithRelations[],
  ])

  /** Список всех статусов для фильтрации */
  const statuses = ['ALL', ...Object.keys(RETURN_STATUS_LABELS)]

  return (
    <Container maxW="8xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin">&larr; Вернуться к панели администратора</NextLink>
          </Link>
          <HStack justify="space-between" align="center" mb={2}>
            <Heading size="2xl" textTransform="none">
              Возвраты
            </Heading>
            {requestedCount > 0 && (
              <Badge colorPalette="red" fontSize="md" px={3} py={1}>
                {requestedCount} ожидают рассмотрения
              </Badge>
            )}
          </HStack>
          <Text color="fg.muted">Управление запросами на возврат товаров</Text>
        </Box>

        {/* Фильтр по статусу */}
        <HStack gap={2} flexWrap="wrap">
          {statuses.map((s) => {
            const isActive = (s === 'ALL' && !statusFilter) || statusFilter === s
            return (
              <Button
                key={s}
                asChild
                size="sm"
                variant={isActive ? 'solid' : 'outline'}
                colorPalette={isActive ? 'fg' : undefined}
              >
                <NextLink href={s === 'ALL' ? '/admin/returns' : `/admin/returns?status=${s}`}>
                  {s === 'ALL' ? `Все (${totalCount})` : RETURN_STATUS_LABELS[s]}
                </NextLink>
              </Button>
            )
          })}
        </HStack>

        {/* Таблица возвратов */}
        <Box overflowX="auto">
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Заказ</Table.ColumnHeader>
                <Table.ColumnHeader>Статус</Table.ColumnHeader>
                <Table.ColumnHeader>Покупатель</Table.ColumnHeader>
                <Table.ColumnHeader>Товар</Table.ColumnHeader>
                <Table.ColumnHeader>Продавец</Table.ColumnHeader>
                <Table.ColumnHeader>Причина</Table.ColumnHeader>
                <Table.ColumnHeader>Сумма</Table.ColumnHeader>
                <Table.ColumnHeader>Дата</Table.ColumnHeader>
                <Table.ColumnHeader>Действия</Table.ColumnHeader>
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
                    <Text fontSize="sm">{r.subOrder.seller.shopName}</Text>
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
                  <Table.Cell>
                    <Button asChild size="sm" variant="outline">
                      <NextLink href={`/admin/returns/${r.id}`}>Подробнее</NextLink>
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>

          {returns.length === 0 && (
            <Box textAlign="center" py={8}>
              <Text color="fg.muted">Нет возвратов для отображения</Text>
            </Box>
          )}
        </Box>
      </VStack>
    </Container>
  )
}
