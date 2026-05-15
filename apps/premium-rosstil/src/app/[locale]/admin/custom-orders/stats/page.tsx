import type { CustomOrderStatus, CustomOrderType } from '@/generated/prisma'
import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import {
  Badge,
  Box,
  Card,
  Container,
  FormatNumber,
  Grid,
  Heading,
  HStack,
  Icon,
  Link,
  SimpleGrid,
  Stat,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import {
  LuBox,
  LuCalendar,
  LuCircleCheck,
  LuCircleX,
  LuClock,
  LuPackage,
  LuPalette,
  LuShoppingBag,
  LuTrendingUp,
  LuUsers,
} from 'react-icons/lu'
import { MonthlyOrdersChart } from './_components/monthly-orders-chart'

// Labels and colors for order types
const TYPE_CONFIG: Record<CustomOrderType, { label: string; color: string; icon: typeof LuBox }> = {
  MADE_TO_ORDER: { label: 'На заказ', color: 'blue', icon: LuPackage },
  CUSTOM_DESIGN: { label: 'Индивидуальный дизайн', color: 'purple', icon: LuPalette },
  B2B_PARTNERSHIP: { label: 'Сотрудничество B2B', color: 'orange', icon: LuUsers },
}

// Labels and colors for order statuses
const STATUS_CONFIG: Record<CustomOrderStatus, { label: string; color: string; icon: typeof LuClock }> = {
  NEW: { label: 'Новый', color: 'blue', icon: LuClock },
  CONFIRMED: { label: 'Подтверждён', color: 'cyan', icon: LuCircleCheck },
  IN_PRODUCTION: { label: 'В производстве', color: 'yellow', icon: LuBox },
  COMPLETED: { label: 'Выполнен', color: 'green', icon: LuCircleCheck },
  CANCELLED: { label: 'Отменён', color: 'red', icon: LuCircleX },
}

// Helper to get month name in Russian
function getMonthName(monthIndex: number): string {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
  return months[monthIndex]
}

export default async function AdminCustomOrdersStatsPage() {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  // Get all statistics in parallel
  const [totalCount, typeStats, statusStats, b2bOrders, monthlyStats, recentOrders] = await Promise.all([
    // Total count
    db.customOrder.count(),

    // Count by type
    db.customOrder.groupBy({
      by: ['type'],
      _count: { id: true },
    }),

    // Count by status
    db.customOrder.groupBy({
      by: ['status'],
      _count: { id: true },
    }),

    // B2B orders with wholesale items for average check calculation
    db.customOrder.findMany({
      where: { type: 'B2B_PARTNERSHIP' },
      include: {
        wholesaleItems: {
          include: {
            size: true,
          },
        },
        variant: {
          include: {
            items: {
              select: {
                sizeId: true,
                price: true,
              },
            },
          },
        },
      },
    }),

    // Monthly stats for the last 6 months
    db.customOrder.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
        },
      },
      select: {
        createdAt: true,
        type: true,
      },
    }),

    // Recent 5 orders
    db.customOrder.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        type: true,
        status: true,
        customerName: true,
        createdAt: true,
      },
    }),
  ])

  // Process type stats
  const typeStatsMap = new Map<CustomOrderType, number>(
    typeStats.map((s: (typeof typeStats)[number]) => [s.type, s._count.id])
  )

  // Process status stats
  const statusStatsMap = new Map<CustomOrderStatus, number>(
    statusStats.map((s: (typeof statusStats)[number]) => [s.status, s._count.id])
  )

  // Calculate B2B average check
  let b2bTotalRevenue = 0
  let b2bOrdersWithItems = 0

  for (const order of b2bOrders) {
    let orderTotal = 0
    // Create a map of sizeId -> price from variant items
    const priceMap = new Map<string, number>()
    if (order.variant?.items) {
      for (const item of order.variant.items) {
        priceMap.set(item.sizeId, Number(item.price))
      }
    }
    // Calculate total using prices from the map
    for (const wholesaleItem of order.wholesaleItems) {
      const price = priceMap.get(wholesaleItem.sizeId) ?? 0
      orderTotal += price * wholesaleItem.quantity
    }
    if (orderTotal > 0) {
      b2bTotalRevenue += orderTotal
      b2bOrdersWithItems++
    }
  }

  const b2bAverageCheck = b2bOrdersWithItems > 0 ? Math.round(b2bTotalRevenue / b2bOrdersWithItems) : 0

  // Process monthly stats
  const monthlyData: { month: string; count: number; byType: Record<CustomOrderType, number> }[] = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthName = getMonthName(monthDate.getMonth())

    const monthOrders = monthlyStats.filter((order: (typeof monthlyStats)[number]) => {
      const orderDate = new Date(order.createdAt)
      return orderDate.getFullYear() === monthDate.getFullYear() && orderDate.getMonth() === monthDate.getMonth()
    })

    const byType: Record<CustomOrderType, number> = {
      MADE_TO_ORDER: 0,
      CUSTOM_DESIGN: 0,
      B2B_PARTNERSHIP: 0,
    }

    for (const order of monthOrders as { type: CustomOrderType }[]) {
      byType[order.type]++
    }

    monthlyData.push({
      month: monthName,
      count: monthOrders.length,
      byType,
    })
  }

  // Calculate completion rate
  const completedCount = statusStatsMap.get('COMPLETED') || 0
  const cancelledCount = statusStatsMap.get('CANCELLED') || 0
  const finishedCount = completedCount + cancelledCount
  const completionRate = finishedCount > 0 ? Math.round((completedCount / finishedCount) * 100) : 0

  // Calculate new orders this month
  const thisMonthOrders = monthlyData[monthlyData.length - 1]?.count || 0
  const lastMonthOrders = monthlyData[monthlyData.length - 2]?.count || 0
  const monthGrowth =
    lastMonthOrders > 0 ? Math.round(((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100) : 0

  return (
    <Container maxW="8xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Header */}
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin/custom-orders">← Вернуться к списку заказов</NextLink>
          </Link>
          <Heading size="2xl" textTransform="none">
            Статистика заказов
          </Heading>
          <Text color="fg.muted">Аналитика специальных заказов</Text>
        </Box>

        {/* Main Stats */}
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={4}>
          <Card.Root>
            <Card.Body>
              <Stat.Root>
                <HStack justify="space-between">
                  <Stat.Label>Всего заказов</Stat.Label>
                  <Icon color="fg.muted">
                    <LuShoppingBag />
                  </Icon>
                </HStack>
                <Stat.ValueText>
                  <FormatNumber value={totalCount} />
                </Stat.ValueText>
                <Stat.HelpText>за всё время</Stat.HelpText>
              </Stat.Root>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Body>
              <Stat.Root>
                <HStack justify="space-between">
                  <Stat.Label>В этом месяце</Stat.Label>
                  <Icon color="fg.muted">
                    <LuCalendar />
                  </Icon>
                </HStack>
                <Stat.ValueText>
                  <FormatNumber value={thisMonthOrders} />
                </Stat.ValueText>
                {monthGrowth !== 0 && (
                  <Stat.HelpText>
                    <Badge colorPalette={monthGrowth > 0 ? 'green' : 'red'} variant="plain" px="0">
                      {monthGrowth > 0 ? <Stat.UpIndicator /> : <Stat.DownIndicator />}
                      {Math.abs(monthGrowth)}%
                    </Badge>{' '}
                    к прошлому месяцу
                  </Stat.HelpText>
                )}
              </Stat.Root>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Body>
              <Stat.Root>
                <HStack justify="space-between">
                  <Stat.Label>Средний чек B2B</Stat.Label>
                  <Icon color="fg.muted">
                    <LuTrendingUp />
                  </Icon>
                </HStack>
                <Stat.ValueText>
                  {/* oxlint-disable-next-line react/style-prop-object -- Chakra FormatNumber API */}
                  <FormatNumber value={b2bAverageCheck} style="currency" currency="RUB" maximumFractionDigits={0} />
                </Stat.ValueText>
                <Stat.HelpText>на основе {b2bOrdersWithItems} заказов</Stat.HelpText>
              </Stat.Root>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Body>
              <Stat.Root>
                <HStack justify="space-between">
                  <Stat.Label>Выполнение</Stat.Label>
                  <Icon color="fg.muted">
                    <LuCircleCheck />
                  </Icon>
                </HStack>
                <Stat.ValueText>{completionRate}%</Stat.ValueText>
                <Stat.HelpText>
                  {completedCount} выполнено / {cancelledCount} отменено
                </Stat.HelpText>
              </Stat.Root>
            </Card.Body>
          </Card.Root>
        </SimpleGrid>

        {/* Stats by Type and Status */}
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
          {/* By Type */}
          <Card.Root>
            <Card.Header>
              <Card.Title>По типам заказов</Card.Title>
            </Card.Header>
            <Card.Body>
              <VStack gap={3} align="stretch">
                {(Object.entries(TYPE_CONFIG) as [CustomOrderType, typeof TYPE_CONFIG.MADE_TO_ORDER][]).map(
                  ([type, config]) => {
                    const count = typeStatsMap.get(type) || 0
                    const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
                    return (
                      <HStack key={type} justify="space-between" p={3} bg="bg.muted" rounded="md">
                        <HStack gap={3}>
                          <Icon color={`${config.color}.fg`}>
                            <config.icon />
                          </Icon>
                          <Text fontWeight="medium">{config.label}</Text>
                        </HStack>
                        <HStack gap={3}>
                          <Badge colorPalette={config.color} size="lg">
                            {count}
                          </Badge>
                          <Text fontSize="sm" color="fg.muted" minW="40px" textAlign="right">
                            {percentage}%
                          </Text>
                        </HStack>
                      </HStack>
                    )
                  }
                )}
              </VStack>
            </Card.Body>
          </Card.Root>

          {/* By Status */}
          <Card.Root>
            <Card.Header>
              <Card.Title>По статусам</Card.Title>
            </Card.Header>
            <Card.Body>
              <VStack gap={3} align="stretch">
                {(Object.entries(STATUS_CONFIG) as [CustomOrderStatus, typeof STATUS_CONFIG.NEW][]).map(
                  ([status, config]) => {
                    const count = statusStatsMap.get(status) || 0
                    const percentage = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
                    return (
                      <HStack key={status} justify="space-between" p={3} bg="bg.muted" rounded="md">
                        <HStack gap={3}>
                          <Icon color={`${config.color}.fg`}>
                            <config.icon />
                          </Icon>
                          <Text fontWeight="medium">{config.label}</Text>
                        </HStack>
                        <HStack gap={3}>
                          <Badge colorPalette={config.color} size="lg">
                            {count}
                          </Badge>
                          <Text fontSize="sm" color="fg.muted" minW="40px" textAlign="right">
                            {percentage}%
                          </Text>
                        </HStack>
                      </HStack>
                    )
                  }
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        </Grid>

        {/* Monthly Stats Chart */}
        <MonthlyOrdersChart data={monthlyData} />

        {/* Monthly Stats Table */}
        <Card.Root>
          <Card.Header>
            <Card.Title>Детализация по месяцам</Card.Title>
          </Card.Header>
          <Card.Body>
            <Box overflowX="auto">
              <Table.Root size="sm" variant="outline">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Месяц</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">Всего</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">На заказ</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">Инд. дизайн</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="center">B2B</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {monthlyData.map((data) => (
                    <Table.Row key={data.month}>
                      <Table.Cell fontWeight="medium">{data.month}</Table.Cell>
                      <Table.Cell textAlign="center">
                        <Badge colorPalette="gray" size="lg">
                          {data.count}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell textAlign="center">
                        <Badge colorPalette="blue">{data.byType.MADE_TO_ORDER}</Badge>
                      </Table.Cell>
                      <Table.Cell textAlign="center">
                        <Badge colorPalette="purple">{data.byType.CUSTOM_DESIGN}</Badge>
                      </Table.Cell>
                      <Table.Cell textAlign="center">
                        <Badge colorPalette="orange">{data.byType.B2B_PARTNERSHIP}</Badge>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          </Card.Body>
        </Card.Root>

        {/* Recent Orders */}
        <Card.Root>
          <Card.Header>
            <HStack justify="space-between">
              <Card.Title>Последние заказы</Card.Title>
              <Link asChild color="fg.muted" fontSize="sm">
                <NextLink href="/admin/custom-orders">Все заказы →</NextLink>
              </Link>
            </HStack>
          </Card.Header>
          <Card.Body>
            <Box overflowX="auto">
              <Table.Root size="sm" variant="outline">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Номер</Table.ColumnHeader>
                    <Table.ColumnHeader>Клиент</Table.ColumnHeader>
                    <Table.ColumnHeader>Тип</Table.ColumnHeader>
                    <Table.ColumnHeader>Статус</Table.ColumnHeader>
                    <Table.ColumnHeader>Дата</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {recentOrders.map(
                    (order: {
                      id: string
                      orderNumber: string
                      type: CustomOrderType
                      status: CustomOrderStatus
                      customerName: string
                      createdAt: Date
                    }) => (
                      <Table.Row key={order.id}>
                        <Table.Cell>
                          <Link asChild color="fg.muted" _hover={{ color: 'fg' }}>
                            <NextLink href={`/admin/custom-orders/${order.id}`}>
                              <Text fontFamily="mono" fontSize="sm">
                                {order.orderNumber}
                              </Text>
                            </NextLink>
                          </Link>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm">{order.customerName}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={TYPE_CONFIG[order.type].color} size="sm">
                            {TYPE_CONFIG[order.type].label}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={STATUS_CONFIG[order.status].color} size="sm">
                            {STATUS_CONFIG[order.status].label}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm" color="fg.muted">
                            {new Date(order.createdAt).toLocaleDateString('ru-RU', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </Text>
                        </Table.Cell>
                      </Table.Row>
                    )
                  )}
                </Table.Body>
              </Table.Root>
            </Box>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  )
}
