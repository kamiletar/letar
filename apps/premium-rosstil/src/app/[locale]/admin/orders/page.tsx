import type { OrderStatus } from '@/generated/prisma'
import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Container, Heading, HStack, Icon, Link, Table, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuChartBar } from 'react-icons/lu'
import { OrderFilters } from './_components/order-filters'
import { OrderStatusBadge, STATUS_LABELS } from './_components/order-status-badge'

// Тип заказа с relations и count
type OrderWithRelations = {
  id: string
  orderNumber: string
  status: OrderStatus
  customerName: string
  customerPhone: string
  customerEmail: string | null
  createdAt: Date
  totalAmount: unknown
  user?: { name: string | null; email: string } | null
  _count: { items: number }
}

interface PageProps {
  searchParams: Promise<{
    status?: string
    search?: string
    dateFrom?: string
    dateTo?: string
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

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  // Get search params
  const params = await searchParams
  const statusFilter = params.status
  const searchQuery = params.search || ''
  const dateFrom = params.dateFrom
  const dateTo = params.dateTo

  // Build where clause
  const where: Record<string, unknown> = {}

  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter as OrderStatus
  }

  if (searchQuery) {
    where.OR = [
      { orderNumber: { contains: searchQuery, mode: 'insensitive' } },
      { customerName: { contains: searchQuery, mode: 'insensitive' } },
      { customerPhone: { contains: searchQuery, mode: 'insensitive' } },
      { customerEmail: { contains: searchQuery, mode: 'insensitive' } },
    ]
  }

  // Date range filter
  if (dateFrom || dateTo) {
    const createdAt: Record<string, Date> = {}
    if (dateFrom) {
      createdAt.gte = new Date(dateFrom)
    }
    if (dateTo) {
      // Add 1 day to include the end date fully
      const endDate = new Date(dateTo)
      endDate.setDate(endDate.getDate() + 1)
      createdAt.lt = endDate
    }
    where.createdAt = createdAt
  }

  // Get total count and filtered orders
  const [totalCount, orders] = await Promise.all([
    db.order.count(),
    db.order.findMany({
      where: where as never,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) as unknown as OrderWithRelations[],
  ])

  return (
    <Container maxW="8xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin">← Вернуться к панели администратора</NextLink>
          </Link>
          <HStack justify="space-between" align="center" mb={2}>
            <Heading size="2xl" textTransform="none">
              Заказы
            </Heading>
            <Button asChild variant="outline" colorPalette="fg">
              <NextLink href="/admin/orders/stats">
                <Icon>
                  <LuChartBar />
                </Icon>
                Статистика
              </NextLink>
            </Button>
          </HStack>
          <Text color="fg.muted">Управление заказами из корзины</Text>
        </Box>

        {/* Filters */}
        <OrderFilters totalCount={totalCount} filteredCount={orders.length} statusLabels={STATUS_LABELS} />

        {/* Orders table */}
        <Box overflowX="auto">
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Номер</Table.ColumnHeader>
                <Table.ColumnHeader>Статус</Table.ColumnHeader>
                <Table.ColumnHeader>Клиент</Table.ColumnHeader>
                <Table.ColumnHeader>Товаров</Table.ColumnHeader>
                <Table.ColumnHeader>Сумма</Table.ColumnHeader>
                <Table.ColumnHeader>Создано</Table.ColumnHeader>
                <Table.ColumnHeader>Действия</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {orders.map((order) => (
                <Table.Row key={order.id}>
                  <Table.Cell>
                    <Text fontSize="sm" fontFamily="mono" fontWeight="medium">
                      {order.orderNumber}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <OrderStatusBadge status={order.status} />
                  </Table.Cell>
                  <Table.Cell>
                    <VStack align="start" gap={0}>
                      <Text fontSize="sm" fontWeight="medium">
                        {order.customerName}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {order.customerPhone}
                      </Text>
                      {order.customerEmail && (
                        <Text fontSize="xs" color="fg.muted">
                          {order.customerEmail}
                        </Text>
                      )}
                    </VStack>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm">{order._count.items} шт.</Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" fontWeight="medium">
                      {formatPrice(Number(order.totalAmount))}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text fontSize="sm" color="fg.muted">
                      {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Button asChild size="sm" variant="outline">
                      <NextLink href={`/admin/orders/${order.orderNumber}`}>Подробнее</NextLink>
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>

          {orders.length === 0 && (
            <Box textAlign="center" py={8}>
              <Text color="fg.muted">Нет заказов для отображения</Text>
            </Box>
          )}
        </Box>
      </VStack>
    </Container>
  )
}
