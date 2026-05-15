import type { CustomOrderStatus, CustomOrderType } from '@/generated/prisma'
import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Box, Button, Container, Heading, HStack, Icon, Link, Table, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuChartBar } from 'react-icons/lu'
import { CustomOrderFilters } from './_components/custom-order-filters'
import { CustomOrderStatusBadge, CustomOrderTypeBadge } from './_components/custom-order-status-badge'

// Тип заказа с relations
type CustomOrderWithRelations = {
  id: string
  orderNumber: string
  type: CustomOrderType
  status: CustomOrderStatus
  customerName: string
  customerPhone: string
  customerEmail: string | null
  createdAt: Date
  product?: { name: string } | null
  variant?: { color: string } | null
  productItem?: { size?: { ru: string | null; international: string | null } | null } | null
}

interface PageProps {
  searchParams: Promise<{
    type?: string
    status?: string
    search?: string
    dateFrom?: string
    dateTo?: string
  }>
}

export default async function AdminCustomOrdersPage({ searchParams }: PageProps) {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  // Get search params
  const params = await searchParams
  const typeFilter = params.type
  const statusFilter = params.status
  const searchQuery = params.search || ''
  const dateFrom = params.dateFrom
  const dateTo = params.dateTo

  // Build where clause
  const where: Record<string, unknown> = {}

  if (typeFilter && typeFilter !== 'ALL') {
    where.type = typeFilter as CustomOrderType
  }

  if (statusFilter && statusFilter !== 'ALL') {
    where.status = statusFilter as CustomOrderStatus
  }

  if (searchQuery) {
    where.OR = [
      { orderNumber: { contains: searchQuery, mode: 'insensitive' } },
      { customerName: { contains: searchQuery, mode: 'insensitive' } },
      { customerPhone: { contains: searchQuery, mode: 'insensitive' } },
      { customerEmail: { contains: searchQuery, mode: 'insensitive' } },
      { companyName: { contains: searchQuery, mode: 'insensitive' } },
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
  const [totalCount, customOrders] = await Promise.all([
    db.customOrder.count(),
    db.customOrder.findMany({
      where: where as never,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        product: {
          select: {
            name: true,
          },
        },
        variant: {
          select: {
            color: true,
          },
        },
        productItem: {
          include: {
            size: {
              select: {
                ru: true,
                international: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    }) as unknown as CustomOrderWithRelations[],
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
              Специальные заказы
            </Heading>
            <Button asChild variant="outline" colorPalette="fg">
              <NextLink href="/admin/custom-orders/stats">
                <Icon>
                  <LuChartBar />
                </Icon>
                Статистика
              </NextLink>
            </Button>
          </HStack>
          <Text color="fg.muted">Управление заявками на пошив и оптовые заказы</Text>
        </Box>

        {/* Filters */}
        <CustomOrderFilters totalCount={totalCount} filteredCount={customOrders.length} />

        {/* Orders table */}
        <Box overflowX="auto">
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Номер</Table.ColumnHeader>
                <Table.ColumnHeader>Тип</Table.ColumnHeader>
                <Table.ColumnHeader>Статус</Table.ColumnHeader>
                <Table.ColumnHeader>Клиент</Table.ColumnHeader>
                <Table.ColumnHeader>Товар</Table.ColumnHeader>
                <Table.ColumnHeader>Создано</Table.ColumnHeader>
                <Table.ColumnHeader>Действия</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {customOrders.map((order) => (
                <Table.Row key={order.id}>
                  <Table.Cell>
                    <Text fontSize="sm" fontFamily="mono" fontWeight="medium">
                      {order.orderNumber}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <CustomOrderTypeBadge type={order.type} />
                  </Table.Cell>
                  <Table.Cell>
                    <CustomOrderStatusBadge status={order.status} />
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
                    <VStack align="start" gap={0}>
                      <Text fontSize="sm" fontWeight="medium">
                        {order.product?.name || 'Индивидуальный дизайн'}
                      </Text>
                      <HStack gap={1}>
                        {order.variant && (
                          <Text fontSize="xs" color="fg.muted">
                            {order.variant.color}
                          </Text>
                        )}
                        {order.productItem?.size && (
                          <Text fontSize="xs" color="fg.muted">
                            • {order.productItem.size.ru || order.productItem.size.international}
                          </Text>
                        )}
                      </HStack>
                    </VStack>
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
                      <NextLink href={`/admin/custom-orders/${order.id}`}>Подробнее</NextLink>
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>

          {customOrders.length === 0 && (
            <Box textAlign="center" py={8}>
              <Text color="fg.muted">Нет заказов для отображения</Text>
            </Box>
          )}
        </Box>
      </VStack>
    </Container>
  )
}
