import type { OrderStatus } from '@/generated/prisma'
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
  LuCalendar,
  LuCircleCheck,
  LuCircleX,
  LuClock,
  LuPackage,
  LuShoppingBag,
  LuShoppingCart,
  LuTrendingUp,
  LuTruck,
} from 'react-icons/lu'
import { MonthlyOrdersChart } from './_components/monthly-orders-chart'

// Labels and colors for order statuses
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; icon: typeof LuClock }> = {
  NEW: { label: 'Новый', color: 'blue', icon: LuClock },
  CONFIRMED: { label: 'Подтверждён', color: 'cyan', icon: LuCircleCheck },
  PROCESSING: { label: 'В обработке', color: 'yellow', icon: LuPackage },
  PREORDER: { label: 'Предзаказ', color: 'orange', icon: LuShoppingCart },
  SHIPPED: { label: 'Отправлен', color: 'purple', icon: LuTruck },
  DELIVERED: { label: 'Доставлен', color: 'green', icon: LuCircleCheck },
  CANCELLED: { label: 'Отменён', color: 'red', icon: LuCircleX },
}

// Helper to get month name in Russian
function getMonthName(monthIndex: number): string {
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек']
  return months[monthIndex]
}

export default async function AdminOrdersStatsPage() {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  // Get all statistics in parallel
  const [totalCount, statusStats, ordersForAverage, monthlyStats, recentOrders] = await Promise.all([
    // Total count
    db.order.count(),

    // Count by status
    db.order.groupBy({
      by: ['status'],
      _count: { id: true },
    }),

    // Orders for average check calculation
    db.order.findMany({
      where: {
        status: {
          in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'],
        },
      },
      select: {
        totalAmount: true,
      },
    }),

    // Monthly stats for the last 6 months
    db.order.findMany({
      where: {
        createdAt: {
          gte: new Date(new Date().setMonth(new Date().getMonth() - 6)),
        },
      },
      select: {
        createdAt: true,
        status: true,
      },
    }),

    // Recent 5 orders
    db.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        customerName: true,
        totalAmount: true,
        createdAt: true,
      },
    }),
  ])

  // Process status stats
  const statusStatsMap = new Map<OrderStatus, number>(
    statusStats.map((s: (typeof statusStats)[number]) => [s.status, s._count.id])
  )

  // Calculate average check (excluding NEW and CANCELLED orders)
  let totalRevenue = 0
  for (const order of ordersForAverage) {
    totalRevenue += Number(order.totalAmount)
  }
  const averageCheck = ordersForAverage.length > 0 ? Math.round(totalRevenue / ordersForAverage.length) : 0

  // Process monthly stats
  const monthlyData: { month: string; count: number; byStatus: Record<OrderStatus, number> }[] = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthName = getMonthName(monthDate.getMonth())

    const monthOrders = monthlyStats.filter((order: (typeof monthlyStats)[number]) => {
      const orderDate = new Date(order.createdAt)
      return orderDate.getFullYear() === monthDate.getFullYear() && orderDate.getMonth() === monthDate.getMonth()
    })

    const byStatus: Record<OrderStatus, number> = {
      NEW: 0,
      CONFIRMED: 0,
      PROCESSING: 0,
      PREORDER: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    }

    for (const order of monthOrders as { status: OrderStatus }[]) {
      byStatus[order.status]++
    }

    monthlyData.push({
      month: monthName,
      count: monthOrders.length,
      byStatus,
    })
  }

  // Calculate completion rate (delivered / (delivered + cancelled))
  const deliveredCount = statusStatsMap.get('DELIVERED') || 0
  const cancelledCount = statusStatsMap.get('CANCELLED') || 0
  const finishedCount = deliveredCount + cancelledCount
  const completionRate = finishedCount > 0 ? Math.round((deliveredCount / finishedCount) * 100) : 0

  // Calculate new orders this month
  const thisMonthOrders = monthlyData[monthlyData.length - 1]?.count || 0
  const lastMonthOrders = monthlyData[monthlyData.length - 2]?.count || 0
  const monthGrowth =
    lastMonthOrders > 0 ? Math.round(((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100) : 0

  // Total revenue
  type OrderForAverage = (typeof ordersForAverage)[number]
  const totalRevenueAll = ordersForAverage.reduce((sum: number, o: OrderForAverage) => sum + Number(o.totalAmount), 0)

  return (
    <Container maxW="8xl" py={8}>
      <VStack gap={8} align="stretch">
        {/* Header */}
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin/orders">← Вернуться к списку заказов</NextLink>
          </Link>
          <Heading size="2xl" textTransform="none">
            Статистика заказов
          </Heading>
          <Text color="fg.muted">Аналитика заказов из корзины</Text>
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
                  <Stat.Label>Средний чек</Stat.Label>
                  <Icon color="fg.muted">
                    <LuShoppingCart />
                  </Icon>
                </HStack>
                <Stat.ValueText>
                  {/* oxlint-disable-next-line react/style-prop-object -- Chakra FormatNumber API */}
                  <FormatNumber value={averageCheck} style="currency" currency="RUB" maximumFractionDigits={0} />
                </Stat.ValueText>
                <Stat.HelpText>на основе {ordersForAverage.length} заказов</Stat.HelpText>
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
                  {deliveredCount} доставлено / {cancelledCount} отменено
                </Stat.HelpText>
              </Stat.Root>
            </Card.Body>
          </Card.Root>
        </SimpleGrid>

        {/* Revenue Stats */}
        <Card.Root>
          <Card.Body>
            <HStack justify="space-between" align="center">
              <Stat.Root>
                <HStack justify="space-between">
                  <Stat.Label>Общая выручка</Stat.Label>
                  <Icon color="fg.muted">
                    <LuTrendingUp />
                  </Icon>
                </HStack>
                <Stat.ValueText>
                  {/* oxlint-disable-next-line react/style-prop-object -- Chakra FormatNumber API */}
                  <FormatNumber value={totalRevenueAll} style="currency" currency="RUB" maximumFractionDigits={0} />
                </Stat.ValueText>
                <Stat.HelpText>подтверждённые, в обработке, отправленные и доставленные заказы</Stat.HelpText>
              </Stat.Root>
            </HStack>
          </Card.Body>
        </Card.Root>

        {/* Stats by Status */}
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
          {/* By Status */}
          <Card.Root>
            <Card.Header>
              <Card.Title>По статусам</Card.Title>
            </Card.Header>
            <Card.Body>
              <VStack gap={3} align="stretch">
                {(Object.entries(STATUS_CONFIG) as [OrderStatus, (typeof STATUS_CONFIG)[OrderStatus]][]).map(
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
                      <Table.ColumnHeader textAlign="center">Доставлено</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="center">Отменено</Table.ColumnHeader>
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
                          <Badge colorPalette="green">{data.byStatus.DELIVERED}</Badge>
                        </Table.Cell>
                        <Table.Cell textAlign="center">
                          <Badge colorPalette="red">{data.byStatus.CANCELLED}</Badge>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </Card.Body>
          </Card.Root>
        </Grid>

        {/* Monthly Stats Chart */}
        <MonthlyOrdersChart data={monthlyData} />

        {/* Recent Orders */}
        <Card.Root>
          <Card.Header>
            <HStack justify="space-between">
              <Card.Title>Последние заказы</Card.Title>
              <Link asChild color="fg.muted" fontSize="sm">
                <NextLink href="/admin/orders">Все заказы →</NextLink>
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
                    <Table.ColumnHeader textAlign="right">Сумма</Table.ColumnHeader>
                    <Table.ColumnHeader>Статус</Table.ColumnHeader>
                    <Table.ColumnHeader>Дата</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {recentOrders.map((order: (typeof recentOrders)[number]) => (
                    <Table.Row key={order.id}>
                      <Table.Cell>
                        <Link asChild color="fg.muted" _hover={{ color: 'fg' }}>
                          <NextLink href={`/admin/orders/${order.orderNumber}`}>
                            <Text fontFamily="mono" fontSize="sm">
                              {order.orderNumber}
                            </Text>
                          </NextLink>
                        </Link>
                      </Table.Cell>
                      <Table.Cell>
                        <Text fontSize="sm">{order.customerName}</Text>
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        <Text fontSize="sm" fontWeight="medium">
                          {/* oxlint-disable react/style-prop-object -- Chakra FormatNumber API */}
                          <FormatNumber
                            value={Number(order.totalAmount)}
                            style="currency"
                            currency="RUB"
                            maximumFractionDigits={0}
                          />
                          {/* oxlint-enable react/style-prop-object */}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        {(() => {
                          const status = order.status as OrderStatus
                          return (
                            <Badge colorPalette={STATUS_CONFIG[status].color} size="sm">
                              {STATUS_CONFIG[status].label}
                            </Badge>
                          )
                        })()}
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
                  ))}
                </Table.Body>
              </Table.Root>
            </Box>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  )
}
