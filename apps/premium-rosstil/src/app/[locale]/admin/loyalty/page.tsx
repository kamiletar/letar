import type { LoyaltyLevel } from '@/generated/prisma'
import { requireAuth } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { LOYALTY_LEVEL_COLORS, LOYALTY_LEVEL_LABELS } from '@/lib/loyalty'
import { Badge, Card, Container, Heading, HStack, Table, Text, VStack } from '@chakra-ui/react'
import { redirect } from 'next/navigation'

export default async function AdminLoyaltyPage() {
  const authUser = await requireAuth()
  if (authUser.role !== 'ADMIN') {
    redirect('/')
  }

  const db = getEnhancedPrisma(authUser)

  // Получаем все аккаунты лояльности с пользователями
  const accounts = await db.loyaltyAccount.findMany({
    orderBy: { totalEarned: 'desc' },
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
  })

  // Статистика
  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)
  const totalEarned = accounts.reduce((sum, a) => sum + a.totalEarned, 0)
  const levelCounts = {
    BRONZE: accounts.filter((a) => a.level === 'BRONZE').length,
    SILVER: accounts.filter((a) => a.level === 'SILVER').length,
    GOLD: accounts.filter((a) => a.level === 'GOLD').length,
  }

  return (
    <Container maxW="7xl" py={8}>
      <VStack gap={6} align="stretch">
        <Heading size="2xl" textTransform="none">
          Программа лояльности
        </Heading>

        {/* Статистика */}
        <HStack gap={4} flexWrap="wrap">
          <Card.Root flex="1" minW="200px">
            <Card.Body>
              <Text fontSize="sm" color="fg.muted">
                Участников
              </Text>
              <Text fontSize="2xl" fontWeight="bold">
                {accounts.length}
              </Text>
            </Card.Body>
          </Card.Root>

          <Card.Root flex="1" minW="200px">
            <Card.Body>
              <Text fontSize="sm" color="fg.muted">
                Баллов в обороте
              </Text>
              <Text fontSize="2xl" fontWeight="bold">
                {totalBalance.toLocaleString('ru-RU')}
              </Text>
            </Card.Body>
          </Card.Root>

          <Card.Root flex="1" minW="200px">
            <Card.Body>
              <Text fontSize="sm" color="fg.muted">
                Всего начислено
              </Text>
              <Text fontSize="2xl" fontWeight="bold">
                {totalEarned.toLocaleString('ru-RU')}
              </Text>
            </Card.Body>
          </Card.Root>

          {(['BRONZE', 'SILVER', 'GOLD'] as const).map((level) => (
            <Card.Root key={level} flex="1" minW="150px">
              <Card.Body>
                <Badge colorPalette={LOYALTY_LEVEL_COLORS[level]} mb={1}>
                  {LOYALTY_LEVEL_LABELS[level]}
                </Badge>
                <Text fontSize="2xl" fontWeight="bold">
                  {levelCounts[level]}
                </Text>
              </Card.Body>
            </Card.Root>
          ))}
        </HStack>

        {/* Таблица участников */}
        <Card.Root>
          <Card.Body>
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Пользователь</Table.ColumnHeader>
                  <Table.ColumnHeader>Email</Table.ColumnHeader>
                  <Table.ColumnHeader>Уровень</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Баланс</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="right">Всего заработано</Table.ColumnHeader>
                  <Table.ColumnHeader>Участник с</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {accounts.map((account) => (
                  <Table.Row key={account.id}>
                    <Table.Cell>
                      <Text fontWeight="medium">{account.user.name || 'Без имени'}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{account.user.email}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge colorPalette={LOYALTY_LEVEL_COLORS[account.level as LoyaltyLevel]} size="sm">
                        {LOYALTY_LEVEL_LABELS[account.level as LoyaltyLevel]}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <Text fontWeight="medium">{account.balance.toLocaleString('ru-RU')}</Text>
                    </Table.Cell>
                    <Table.Cell textAlign="right">
                      <Text>{account.totalEarned.toLocaleString('ru-RU')}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text fontSize="sm">{new Date(account.createdAt).toLocaleDateString('ru-RU')}</Text>
                    </Table.Cell>
                  </Table.Row>
                ))}

                {accounts.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={6}>
                      <Text textAlign="center" py={4} color="fg.muted">
                        Нет участников программы лояльности
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>
          </Card.Body>
        </Card.Root>
      </VStack>
    </Container>
  )
}
