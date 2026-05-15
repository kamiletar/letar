import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Card, Container, Grid, Heading, HStack, Table, Text, VStack } from '@chakra-ui/react'

/** Форматирование суммы в рублях */
function formatRub(amount: number): string {
  return amount.toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  })
}

export default async function AdminFinancesPage() {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  // Загрузить данные
  const [sellerBalances, totalCommission, pendingPayoutRequests, recentPayouts] = await Promise.all([
    // Балансы всех продавцов
    db.sellerBalance.findMany({
      include: {
        seller: {
          select: { shopName: true, slug: true, commissionRate: true },
        },
      },
    }),
    // Общая комиссия (сумма commissionAmount из всех оплаченных SubOrders)
    db.subOrder.aggregate({
      _sum: { commissionAmount: true },
      where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] } },
    }),
    // Запросы на выплату в ожидании
    db.payoutRequest.findMany({
      where: { status: 'PENDING' as never },
      orderBy: { createdAt: 'desc' },
      include: {
        seller: { select: { shopName: true } },
      },
    }),
    // Последние выплаты
    db.payout.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        seller: { select: { shopName: true } },
      },
    }),
  ])

  // Подсчёты
  const totalAvailable = sellerBalances.reduce((sum, b) => sum + Number(b.availableAmount), 0)
  const totalPending = sellerBalances.reduce((sum, b) => sum + Number(b.pendingAmount), 0)
  const totalReserved = sellerBalances.reduce((sum, b) => sum + Number(b.reservedAmount), 0)
  const totalCommissionAmount = Number(totalCommission._sum.commissionAmount || 0)

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={6} align="stretch">
        <Heading size="2xl" textTransform="none">
          Финансы
        </Heading>

        {/* Карточки со сводкой */}
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={4}>
          <Card.Root>
            <Card.Body>
              <VStack gap={1} align="start">
                <Text fontSize="sm" color="fg.muted">
                  Комиссия (всего)
                </Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {formatRub(totalCommissionAmount)}
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Body>
              <VStack gap={1} align="start">
                <Text fontSize="sm" color="fg.muted">
                  Доступно к выплате
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="green.fg">
                  {formatRub(totalAvailable)}
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Body>
              <VStack gap={1} align="start">
                <Text fontSize="sm" color="fg.muted">
                  Ожидает подтверждения
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="orange.fg">
                  {formatRub(totalPending)}
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>

          <Card.Root>
            <Card.Body>
              <VStack gap={1} align="start">
                <Text fontSize="sm" color="fg.muted">
                  Заморожено
                </Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {formatRub(totalReserved)}
                </Text>
              </VStack>
            </Card.Body>
          </Card.Root>
        </Grid>

        {/* Запросы на выплату */}
        {pendingPayoutRequests.length > 0 && (
          <Box>
            <HStack mb={3}>
              <Heading size="lg" textTransform="none">
                Запросы на выплату
              </Heading>
              <Badge colorPalette="orange">{pendingPayoutRequests.length}</Badge>
            </HStack>
            <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Продавец</Table.ColumnHeader>
                    <Table.ColumnHeader>Сумма</Table.ColumnHeader>
                    <Table.ColumnHeader>Дата</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {pendingPayoutRequests.map((req) => {
                    const r = req as typeof req & { seller: { shopName: string } }
                    return (
                      <Table.Row key={r.id}>
                        <Table.Cell>{r.seller.shopName}</Table.Cell>
                        <Table.Cell>{formatRub(Number(r.requestedAmount))}</Table.Cell>
                        <Table.Cell>{r.createdAt.toLocaleDateString('ru-RU')}</Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Root>
            </Box>
          </Box>
        )}

        {/* Балансы продавцов */}
        <Box>
          <Heading size="lg" mb={3} textTransform="none">
            Балансы продавцов
          </Heading>
          <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Магазин</Table.ColumnHeader>
                  <Table.ColumnHeader>Комиссия</Table.ColumnHeader>
                  <Table.ColumnHeader>Доступно</Table.ColumnHeader>
                  <Table.ColumnHeader>Ожидает</Table.ColumnHeader>
                  <Table.ColumnHeader>Заморожено</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sellerBalances.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={5}>
                      <Text textAlign="center" color="fg.muted" py={4}>
                        Нет данных
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  sellerBalances.map((balance) => {
                    const b = balance as typeof balance & { seller: { shopName: string; commissionRate: number } }
                    return (
                      <Table.Row key={b.id}>
                        <Table.Cell>
                          <Text fontWeight="medium">{b.seller.shopName}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm">{(Number(b.seller.commissionRate) * 100).toFixed(0)}%</Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm" color="green.fg">
                            {formatRub(Number(b.availableAmount))}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm" color="orange.fg">
                            {formatRub(Number(b.pendingAmount))}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text fontSize="sm">{formatRub(Number(b.reservedAmount))}</Text>
                        </Table.Cell>
                      </Table.Row>
                    )
                  })
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        </Box>

        {/* Последние выплаты */}
        {recentPayouts.length > 0 && (
          <Box>
            <Heading size="lg" mb={3} textTransform="none">
              Последние выплаты
            </Heading>
            <Box borderWidth="1px" borderRadius="lg" overflow="hidden">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Продавец</Table.ColumnHeader>
                    <Table.ColumnHeader>Сумма</Table.ColumnHeader>
                    <Table.ColumnHeader>Статус</Table.ColumnHeader>
                    <Table.ColumnHeader>Дата</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {recentPayouts.map((payout) => {
                    const p = payout as typeof payout & { seller: { shopName: string } }
                    return (
                      <Table.Row key={p.id}>
                        <Table.Cell>{p.seller.shopName}</Table.Cell>
                        <Table.Cell>{formatRub(Number(p.amount))}</Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={p.status === 'COMPLETED' ? 'green' : 'orange'}>
                            {p.status === 'COMPLETED' ? 'Выплачено' : p.status}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell>{p.createdAt.toLocaleDateString('ru-RU')}</Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Root>
            </Box>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
