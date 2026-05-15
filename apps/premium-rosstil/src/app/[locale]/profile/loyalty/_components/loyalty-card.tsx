'use client'

import type { LoyaltyLevel } from '@/generated/prisma'
import {
  LOYALTY_CASHBACK_RATE,
  LOYALTY_LEVEL_COLORS,
  LOYALTY_LEVEL_LABELS,
  LOYALTY_THRESHOLDS,
  pointsToNextLevel,
} from '@/lib/loyalty'
import { Badge, Box, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { FaGem } from 'react-icons/fa'

interface LoyaltyCardProps {
  balance: number
  totalEarned: number
  level: LoyaltyLevel
}

/** Карточка программы лояльности в профиле */
export function LoyaltyCard({ balance, totalEarned, level }: LoyaltyCardProps) {
  const nextLevelPoints = pointsToNextLevel(totalEarned, level)
  const cashbackPercent = Math.round(LOYALTY_CASHBACK_RATE[level] * 100)

  // Прогресс до следующего уровня
  let progressPercent = 100
  if (level !== 'GOLD') {
    const currentThreshold = LOYALTY_THRESHOLDS[level]
    const nextThreshold = level === 'BRONZE' ? LOYALTY_THRESHOLDS.SILVER : LOYALTY_THRESHOLDS.GOLD
    progressPercent = Math.min(100, ((totalEarned - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
  }

  return (
    <Card.Root>
      <Card.Body>
        <VStack gap={6} align="stretch">
          {/* Заголовок с уровнем */}
          <HStack justify="space-between" align="center">
            <HStack gap={3}>
              <Box color={`${LOYALTY_LEVEL_COLORS[level]}.500`} fontSize="2xl">
                <FaGem />
              </Box>
              <VStack align="start" gap={0}>
                <Heading size="lg" textTransform="none">
                  Программа лояльности
                </Heading>
                <Badge colorPalette={LOYALTY_LEVEL_COLORS[level]} size="lg">
                  {LOYALTY_LEVEL_LABELS[level]}
                </Badge>
              </VStack>
            </HStack>
            <VStack align="end" gap={0}>
              <Text fontSize="2xl" fontWeight="bold">
                {balance.toLocaleString('ru-RU')}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                баллов
              </Text>
            </VStack>
          </HStack>

          {/* Кэшбэк */}
          <Box bg="bg.subtle" borderRadius="md" p={4}>
            <HStack justify="space-between">
              <Text>Кэшбэк с покупок</Text>
              <Text fontWeight="bold" color="fg">
                {cashbackPercent}%
              </Text>
            </HStack>
            <Text fontSize="sm" color="fg.muted" mt={1}>
              1 балл = 1 ₽ скидки
            </Text>
          </Box>

          {/* Прогресс до следующего уровня */}
          {nextLevelPoints !== null && (
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" color="fg.muted">
                  До уровня «{level === 'BRONZE' ? LOYALTY_LEVEL_LABELS.SILVER : LOYALTY_LEVEL_LABELS.GOLD}»
                </Text>
                <Text fontSize="sm" fontWeight="medium">
                  {nextLevelPoints.toLocaleString('ru-RU')} баллов
                </Text>
              </HStack>
              <Box bg="bg.muted" borderRadius="full" h={2} overflow="hidden">
                <Box bg="fg" h="100%" w={`${progressPercent}%`} borderRadius="full" transition="width 0.3s" />
              </Box>
            </Box>
          )}

          {/* Всего заработано */}
          <HStack justify="space-between" borderTopWidth="1px" pt={4}>
            <Text fontSize="sm" color="fg.muted">
              Всего заработано
            </Text>
            <Text fontSize="sm" fontWeight="medium">
              {totalEarned.toLocaleString('ru-RU')} баллов
            </Text>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
