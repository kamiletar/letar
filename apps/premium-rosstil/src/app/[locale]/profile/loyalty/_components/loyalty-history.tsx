'use client'

import type { LoyaltyTransactionType } from '@/generated/prisma'
import { Badge, Box, HStack, Table, Text, VStack } from '@chakra-ui/react'

interface Transaction {
  id: string
  type: LoyaltyTransactionType
  amount: number
  balanceAfter: number
  description: string
  createdAt: Date
}

interface LoyaltyHistoryProps {
  transactions: Transaction[]
  total: number
}

const TYPE_LABELS: Record<LoyaltyTransactionType, string> = {
  EARN: 'Начисление',
  SPEND: 'Списание',
  ADJUSTMENT: 'Корректировка',
}

const TYPE_COLORS: Record<LoyaltyTransactionType, string> = {
  EARN: 'green',
  SPEND: 'red',
  ADJUSTMENT: 'blue',
}

/** Таблица истории транзакций лояльности */
export function LoyaltyHistory({ transactions, total }: LoyaltyHistoryProps) {
  if (transactions.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Text color="fg.muted">История операций пуста</Text>
        <Text fontSize="sm" color="fg.muted" mt={1}>
          Баллы начисляются после доставки заказа
        </Text>
      </Box>
    )
  }

  return (
    <VStack align="stretch" gap={4}>
      <HStack justify="space-between">
        <Text fontWeight="medium">История операций</Text>
        <Badge variant="subtle">{total} операций</Badge>
      </HStack>

      <Table.Root size="sm">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Дата</Table.ColumnHeader>
            <Table.ColumnHeader>Тип</Table.ColumnHeader>
            <Table.ColumnHeader>Описание</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Баллы</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Баланс</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {transactions.map((tx) => (
            <Table.Row key={tx.id}>
              <Table.Cell>
                <Text fontSize="sm">
                  {new Date(tx.createdAt).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Badge colorPalette={TYPE_COLORS[tx.type]} size="sm">
                  {TYPE_LABELS[tx.type]}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Text fontSize="sm">{tx.description}</Text>
              </Table.Cell>
              <Table.Cell textAlign="right">
                <Text fontSize="sm" fontWeight="medium" color={tx.amount > 0 ? 'green.600' : 'red.600'}>
                  {tx.amount > 0 ? '+' : ''}
                  {tx.amount.toLocaleString('ru-RU')}
                </Text>
              </Table.Cell>
              <Table.Cell textAlign="right">
                <Text fontSize="sm">{tx.balanceAfter.toLocaleString('ru-RU')}</Text>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </VStack>
  )
}
