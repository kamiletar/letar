'use client'

/**
 * Страница репутации пользователя
 * Показывает статистику, репутацию, достижения и бонусные очки
 */

import { Box, SimpleGrid, VStack } from '@chakra-ui/react'

import { Header } from '@/components/layout'

import { AchievementsCard, BonusPointsCard, ReputationCard, StatsCard } from './_components'
import { useAchievements, useBonusPoints, useReputation, useStats } from './_hooks'

// Отключаем статическую генерацию для страницы репутации
export const dynamic = 'force-dynamic'

/**
 * Страница репутации пользователя
 */
export default function ReputationPage() {
  const { stats, isLoading: isLoadingStats } = useStats()
  const { reputation, isLoading: isLoadingReputation } = useReputation()
  const { achievements, isLoading: isLoadingAchievements } = useAchievements()
  const { bonusPoints, transactions, isLoading: isLoadingBonus } = useBonusPoints()

  return (
    <Box minH="100vh" bg="bg" color="fg">
      <Header title="Репутация" />

      <Box p={6}>
        <VStack gap={6} align="stretch">
          {/* Верхняя строка: Статистика + Репутация */}
          <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
            <StatsCard stats={stats} isLoading={isLoadingStats} />
            <ReputationCard reputation={reputation} isLoading={isLoadingReputation} />
          </SimpleGrid>

          {/* Бонусные очки */}
          <BonusPointsCard bonusPoints={bonusPoints} transactions={transactions} isLoading={isLoadingBonus} />

          {/* Достижения */}
          <AchievementsCard achievements={achievements} isLoading={isLoadingAchievements} />
        </VStack>
      </Box>
    </Box>
  )
}
