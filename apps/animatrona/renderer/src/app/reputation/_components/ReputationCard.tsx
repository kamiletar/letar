'use client'

/**
 * Карточка репутации пользователя
 * Показывает score, rank, и компоненты репутации
 */

import { Box, Card, Heading, HStack, Progress, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { LuAward, LuClock, LuHardDrive, LuTrendingUp, LuUsers, LuZap } from 'react-icons/lu'

import type { UserReputation } from '../../../../../shared/types/reputation'
import { UserRank } from '../../../../../shared/types/reputation'

interface ReputationCardProps {
  reputation: UserReputation | null
  isLoading?: boolean
}

/**
 * Конфигурация рангов
 */
const RANK_CONFIG: Record<UserRank, { label: string; color: string; emoji: string }> = {
  [UserRank.NEWCOMER]: { label: 'Новичок', color: 'gray.400', emoji: '🌱' },
  [UserRank.CONTRIBUTOR]: { label: 'Контрибьютор', color: 'green.400', emoji: '🌿' },
  [UserRank.REGULAR]: { label: 'Постоянный', color: 'blue.400', emoji: '⭐' },
  [UserRank.VETERAN]: { label: 'Ветеран', color: 'purple.400', emoji: '🏆' },
  [UserRank.LEGEND]: { label: 'Легенда', color: 'yellow.400', emoji: '👑' },
}

interface ScoreComponentProps {
  icon: React.ElementType
  label: string
  value: number
  maxValue: number
  color: string
}

function ScoreComponent({ icon: IconComponent, label, value, maxValue, color }: ScoreComponentProps) {
  const percentage = (value / maxValue) * 100

  return (
    <VStack align="stretch" gap={1}>
      <HStack justify="space-between">
        <HStack gap={2}>
          <IconComponent size={16} color={`var(--chakra-colors-${color.replaceAll('.', '-')})`} />
          <Text fontSize="sm" color="fg.subtle">
            {label}
          </Text>
        </HStack>
        <Text fontSize="sm" fontWeight="medium">
          {value.toFixed(1)}/{maxValue}
        </Text>
      </HStack>
      <Progress.Root value={percentage} size="sm" colorPalette={color.split('.')[0]}>
        <Progress.Track>
          <Progress.Range />
        </Progress.Track>
      </Progress.Root>
    </VStack>
  )
}

export function ReputationCard({ reputation, isLoading }: ReputationCardProps) {
  if (isLoading) {
    return (
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Header>
          <HStack gap={3}>
            <LuAward size={20} color="var(--chakra-colors-yellow-400)" />
            <Heading size="md">Репутация</Heading>
          </HStack>
        </Card.Header>
        <Card.Body>
          <Text color="fg.subtle">Загрузка...</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  if (!reputation) {
    return (
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Header>
          <HStack gap={3}>
            <LuAward size={20} color="var(--chakra-colors-yellow-400)" />
            <Heading size="md">Репутация</Heading>
          </HStack>
        </Card.Header>
        <Card.Body>
          <Text color="fg.subtle">Нет данных</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  const rankConfig = RANK_CONFIG[reputation.rank]
  const nextRankScore = Math.ceil((reputation.score + 1) / 20) * 20

  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Header>
        <HStack gap={3}>
          <LuAward size={20} color="var(--chakra-colors-yellow-400)" />
          <Heading size="md">Репутация</Heading>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack gap={6} align="stretch">
          {/* Основной Score и Rank */}
          <HStack justify="space-between" align="center">
            <VStack align="start" gap={0}>
              <Text fontSize="4xl" fontWeight="bold" lineHeight={1}>
                {reputation.score}
              </Text>
              <Text fontSize="sm" color="fg.subtle">
                очков репутации
              </Text>
            </VStack>
            <Box px={4} py={2} borderRadius="full" bg={`${rankConfig.color.split('.')[0]}.subtle`}>
              <HStack gap={2}>
                <Text fontSize="lg">{rankConfig.emoji}</Text>
                <Text fontWeight="bold" color={rankConfig.color}>
                  {rankConfig.label}
                </Text>
              </HStack>
            </Box>
          </HStack>

          {/* Прогресс до следующего ранга */}
          {reputation.score < 100 && (
            <Box>
              <HStack justify="space-between" mb={2}>
                <Text fontSize="sm" color="fg.subtle">
                  Прогресс до следующего ранга
                </Text>
                <Text fontSize="sm" color="fg.subtle">
                  {reputation.score}/{nextRankScore}
                </Text>
              </HStack>
              <Progress.Root value={(reputation.score / nextRankScore) * 100} size="md" colorPalette="purple">
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            </Box>
          )}

          {/* Компоненты Score */}
          <Box>
            <Text fontWeight="medium" mb={4}>
              Компоненты репутации
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              <ScoreComponent
                icon={LuTrendingUp}
                label="Ratio"
                value={reputation.ratioScore}
                maxValue={30}
                color="green.400"
              />
              <ScoreComponent
                icon={LuClock}
                label="Время раздачи"
                value={reputation.seedingTimeScore}
                maxValue={25}
                color="blue.400"
              />
              <ScoreComponent
                icon={LuHardDrive}
                label="Уникальный контент"
                value={reputation.uniqueContentScore}
                maxValue={20}
                color="purple.400"
              />
              <ScoreComponent
                icon={LuUsers}
                label="Помощь пирам"
                value={reputation.helpedPeersScore}
                maxValue={15}
                color="teal.400"
              />
              <ScoreComponent
                icon={LuZap}
                label="Стаж"
                value={reputation.longevityScore}
                maxValue={10}
                color="orange.400"
              />
            </SimpleGrid>
          </Box>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
