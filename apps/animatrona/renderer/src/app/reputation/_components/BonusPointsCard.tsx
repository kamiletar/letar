'use client'

/**
 * Карточка бонусных очков
 * Показывает баланс и историю транзакций
 */

import { Badge, Box, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { LuArrowDown, LuArrowUp, LuCoins, LuGift, LuSettings, LuTrophy } from 'react-icons/lu'

import type { BonusPoints, BonusTransaction } from '../../../../../shared/types/bonus-points'

interface BonusPointsCardProps {
  bonusPoints: BonusPoints | null
  transactions: BonusTransaction[]
  isLoading?: boolean
}

/**
 * Форматирует число очков
 */
function formatPoints(points: number): string {
  if (points >= 1000000) {
    return `${(points / 1000000).toFixed(1)}M`
  }
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`
  }
  return points.toString()
}

/**
 * Иконка и цвет для типа транзакции
 */
const TRANSACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  earning: { icon: LuArrowUp, color: 'green.400', label: 'Заработок' },
  achievement: { icon: LuTrophy, color: 'orange.400', label: 'Достижение' },
  spending: { icon: LuArrowDown, color: 'red.400', label: 'Трата' },
  bonus: { icon: LuGift, color: 'purple.400', label: 'Бонус' },
  adjustment: { icon: LuSettings, color: 'gray.400', label: 'Корректировка' },
}

interface TransactionItemProps {
  transaction: BonusTransaction
}

function TransactionItem({ transaction }: TransactionItemProps) {
  const config = TRANSACTION_CONFIG[transaction.type] || TRANSACTION_CONFIG.adjustment
  const isPositive = transaction.amount > 0
  const ConfigIcon = config.icon

  return (
    <HStack
      justify="space-between"
      py={2}
      borderBottom="1px"
      borderColor="border.subtle"
      _last={{ borderBottom: 'none' }}
    >
      <HStack gap={3}>
        <ConfigIcon size={16} color={`var(--chakra-colors-${config.color.replaceAll('.', '-')})`} />
        <VStack align="start" gap={0}>
          <Text fontSize="sm" fontWeight="medium">
            {transaction.description}
          </Text>
          <Text fontSize="xs" color="fg.subtle">
            {new Date(transaction.createdAt).toLocaleString('ru-RU', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </VStack>
      </HStack>
      <Text fontWeight="bold" color={isPositive ? 'green.400' : 'red.400'}>
        {isPositive ? '+' : ''}
        {transaction.amount}
      </Text>
    </HStack>
  )
}

export function BonusPointsCard({ bonusPoints, transactions, isLoading }: BonusPointsCardProps) {
  if (isLoading) {
    return (
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Header>
          <HStack gap={3}>
            <LuCoins size={20} color="var(--chakra-colors-yellow-400)" />
            <Heading size="md">Бонусные очки</Heading>
          </HStack>
        </Card.Header>
        <Card.Body>
          <Text color="fg.subtle">Загрузка...</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  if (!bonusPoints) {
    return (
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Header>
          <HStack gap={3}>
            <LuCoins size={20} color="var(--chakra-colors-yellow-400)" />
            <Heading size="md">Бонусные очки</Heading>
          </HStack>
        </Card.Header>
        <Card.Body>
          <Text color="fg.subtle">Нет данных</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Header>
        <HStack gap={3}>
          <LuCoins size={20} color="var(--chakra-colors-yellow-400)" />
          <Heading size="md">Бонусные очки</Heading>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack gap={6} align="stretch">
          {/* Баланс */}
          <HStack justify="space-between" align="center">
            <VStack align="start" gap={0}>
              <Text fontSize="4xl" fontWeight="bold" lineHeight={1}>
                {formatPoints(bonusPoints.balance)}
              </Text>
              <Text fontSize="sm" color="fg.subtle">
                текущий баланс
              </Text>
            </VStack>
            <VStack align="end" gap={1}>
              <HStack gap={2}>
                <Badge colorPalette="green" variant="subtle">
                  +{formatPoints(bonusPoints.totalEarned)}
                </Badge>
              </HStack>
              <HStack gap={2}>
                <Badge colorPalette="red" variant="subtle">
                  -{formatPoints(bonusPoints.totalSpent)}
                </Badge>
              </HStack>
            </VStack>
          </HStack>

          {/* История транзакций */}
          {transactions.length > 0 && (
            <Box>
              <Text fontWeight="medium" mb={3}>
                Последние транзакции
              </Text>
              <VStack align="stretch" gap={0}>
                {transactions.slice(0, 10).map((transaction) => (
                  <TransactionItem key={transaction.id} transaction={transaction} />
                ))}
              </VStack>
            </Box>
          )}

          {transactions.length === 0 && (
            <Text fontSize="sm" color="fg.subtle" textAlign="center">
              Нет транзакций
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
