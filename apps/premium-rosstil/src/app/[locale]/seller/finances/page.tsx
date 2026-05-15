import { requireSeller } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { payoutRequestStatusLabels, payoutStatusLabels } from '@/premium-rosstil-form/labels'
import { Badge, Box, Card, Heading, SimpleGrid, Table, Text, VStack } from '@chakra-ui/react'
import { PayoutRequestForm } from './payout-request-form'

/**
 * Страница финансов продавца: баланс, выплаты, запросы на выплату.
 */
export default async function SellerFinancesPage() {
  const user = await requireSeller()
  const db = getEnhancedPrisma(user)

  const seller = await db.seller.findUnique({
    where: { userId: user.id },
    select: { id: true, commissionRate: true, taxSystem: true },
  })

  if (!seller) {
    return <Text>Профиль продавца не найден.</Text>
  }

  const [balance, payouts, payoutRequests] = await Promise.all([
    db.sellerBalance.findUnique({
      where: { sellerId: seller.id },
    }),
    db.payout.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    db.payoutRequest.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount)

  const available = Number(balance?.availableAmount ?? 0)
  const pending = Number(balance?.pendingAmount ?? 0)
  const reserved = Number(balance?.reservedAmount ?? 0)

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Heading size="xl">Финансы</Heading>
        <Text color="fg.muted">Комиссия: {(Number(seller.commissionRate) * 100).toFixed(1)}%</Text>
      </Box>

      {/* Карточки баланса */}
      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
        <Card.Root>
          <Card.Body>
            <Text fontSize="sm" color="fg.muted">
              Доступно к выплате
            </Text>
            <Heading size="xl" color="green.600">
              {formatCurrency(available)}
            </Heading>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body>
            <Text fontSize="sm" color="fg.muted">
              Ожидает подтверждения
            </Text>
            <Heading size="xl" color="orange.500">
              {formatCurrency(pending)}
            </Heading>
          </Card.Body>
        </Card.Root>
        <Card.Root>
          <Card.Body>
            <Text fontSize="sm" color="fg.muted">
              Заморожено (возвраты)
            </Text>
            <Heading size="xl" color="red.500">
              {formatCurrency(reserved)}
            </Heading>
          </Card.Body>
        </Card.Root>
      </SimpleGrid>

      {/* Форма запроса выплаты */}
      {available > 0 && (
        <Card.Root>
          <Card.Header>
            <Heading size="md">Запросить выплату</Heading>
          </Card.Header>
          <Card.Body>
            <PayoutRequestForm availableAmount={available} />
          </Card.Body>
        </Card.Root>
      )}

      {/* Запросы на выплату */}
      {payoutRequests.length > 0 && (
        <Card.Root>
          <Card.Header>
            <Heading size="md">Запросы на выплату</Heading>
          </Card.Header>
          <Card.Body p={0}>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Дата</Table.ColumnHeader>
                  <Table.ColumnHeader>Сумма</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                  <Table.ColumnHeader>Чек</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {payoutRequests.map((req) => (
                  <Table.Row key={req.id}>
                    <Table.Cell>{new Date(req.createdAt).toLocaleDateString('ru-RU')}</Table.Cell>
                    <Table.Cell>{formatCurrency(Number(req.requestedAmount))}</Table.Cell>
                    <Table.Cell>
                      <Badge
                        colorPalette={
                          req.status === 'PAID'
                            ? 'green'
                            : req.status === 'APPROVED'
                              ? 'blue'
                              : req.status === 'REJECTED'
                                ? 'red'
                                : req.status === 'PENDING_REVIEW'
                                  ? 'yellow'
                                  : 'gray'
                        }
                        size="sm"
                      >
                        {payoutRequestStatusLabels[req.status] ?? req.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>{req.receiptNumber || '—'}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card.Body>
        </Card.Root>
      )}

      {/* История выплат */}
      {payouts.length > 0 && (
        <Card.Root>
          <Card.Header>
            <Heading size="md">История выплат</Heading>
          </Card.Header>
          <Card.Body p={0}>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Дата</Table.ColumnHeader>
                  <Table.ColumnHeader>Сумма</Table.ColumnHeader>
                  <Table.ColumnHeader>Выплата</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {payouts.map((payout) => (
                  <Table.Row key={payout.id}>
                    <Table.Cell>{new Date(payout.createdAt).toLocaleDateString('ru-RU')}</Table.Cell>
                    <Table.Cell>{formatCurrency(Number(payout.amount))}</Table.Cell>
                    <Table.Cell>{formatCurrency(Number(payout.netAmount))}</Table.Cell>
                    <Table.Cell>
                      <Badge
                        colorPalette={
                          payout.status === 'COMPLETED'
                            ? 'green'
                            : payout.status === 'FAILED'
                              ? 'red'
                              : payout.status === 'PROCESSING'
                                ? 'yellow'
                                : 'gray'
                        }
                        size="sm"
                      >
                        {payoutStatusLabels[payout.status] ?? payout.status}
                      </Badge>
                    </Table.Cell>
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
