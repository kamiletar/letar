import { requireAdmin } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Button, Container, Heading, Link, Table, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { PromoToggle } from './_components/promo-toggle'

/** Тип промокода для списка */
type PromoItem = {
  id: string
  code: string
  type: string
  discount: unknown
  isActive: boolean
  dateFrom: Date
  dateTo: Date
  minAmount: unknown
  maxUsages: number | null
  usageCount: number
  perCustomer: number
  _count: { orders: number }
}

function formatDiscount(type: string, discount: unknown): string {
  const value = Number(discount)
  return type === 'PERCENTAGE' ? `${value}%` : `${value.toLocaleString('ru-RU')} ₽`
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function isExpired(dateTo: Date): boolean {
  return new Date(dateTo) < new Date()
}

export default async function AdminPromosPage() {
  const user = await requireAdmin()
  const db = getEnhancedPrisma(user)

  const promos = (await db.promo.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { orders: true } } },
  })) as unknown as PromoItem[]

  return (
    <Container maxW="6xl" py={8}>
      <VStack gap={8} align="stretch">
        <Box>
          <Link asChild color="fg.muted" fontSize="sm" mb={2}>
            <NextLink href="/admin">&larr; Вернуться к панели администратора</NextLink>
          </Link>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Heading size="2xl" textTransform="none">
              Промокоды
            </Heading>
            <Button asChild colorPalette="fg">
              <NextLink href="/admin/promos/new">Создать</NextLink>
            </Button>
          </Box>
          <Text color="fg.muted">Управление промокодами и скидками. Всего: {promos.length}</Text>
        </Box>

        {promos.length > 0 ? (
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Код</Table.ColumnHeader>
                  <Table.ColumnHeader>Скидка</Table.ColumnHeader>
                  <Table.ColumnHeader>Период</Table.ColumnHeader>
                  <Table.ColumnHeader>Использований</Table.ColumnHeader>
                  <Table.ColumnHeader>Мин. сумма</Table.ColumnHeader>
                  <Table.ColumnHeader>Статус</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Действия</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {promos.map((promo) => {
                  const expired = isExpired(promo.dateTo)
                  const usagesText = promo.maxUsages
                    ? `${promo.usageCount} / ${promo.maxUsages}`
                    : `${promo.usageCount}`

                  return (
                    <Table.Row key={promo.id} opacity={!promo.isActive || expired ? 0.6 : 1}>
                      <Table.Cell>
                        <Text fontWeight="bold" fontFamily="mono">
                          {promo.code}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>{formatDiscount(promo.type, promo.discount)}</Table.Cell>
                      <Table.Cell>
                        <Text fontSize="xs">
                          {formatDate(promo.dateFrom)} — {formatDate(promo.dateTo)}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>{usagesText}</Table.Cell>
                      <Table.Cell>
                        {promo.minAmount ? `от ${Number(promo.minAmount).toLocaleString('ru-RU')} ₽` : '—'}
                      </Table.Cell>
                      <Table.Cell>
                        {expired ? (
                          <Badge colorPalette="red">Истёк</Badge>
                        ) : promo.isActive ? (
                          <Badge colorPalette="green">Активен</Badge>
                        ) : (
                          <Badge colorPalette="gray">Выключен</Badge>
                        )}
                      </Table.Cell>
                      <Table.Cell textAlign="right">
                        <Box display="flex" gap={2} justifyContent="flex-end" alignItems="center">
                          <PromoToggle id={promo.id} isActive={promo.isActive} />
                          <Button asChild variant="outline" size="xs">
                            <NextLink href={`/admin/promos/${promo.id}/edit`}>Изменить</NextLink>
                          </Button>
                        </Box>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Root>
          </Box>
        ) : (
          <Box textAlign="center" py={8}>
            <Text color="fg.muted" mb={4}>
              Нет промокодов
            </Text>
            <Button asChild colorPalette="fg">
              <NextLink href="/admin/promos/new">Создать первый промокод</NextLink>
            </Button>
          </Box>
        )}
      </VStack>
    </Container>
  )
}
