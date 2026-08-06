'use client'

/**
 * Карточка достижений пользователя
 * Показывает разблокированные и заблокированные достижения
 */

import { Badge, Box, Card, Heading, HStack, Icon, Progress, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { LuLock, LuTrophy } from 'react-icons/lu'

import type { AchievementWithProgress } from '../../../../../shared/types/achievements'

interface AchievementsCardProps {
  achievements: AchievementWithProgress[]
  isLoading?: boolean
}

/**
 * Цвета для уровней достижений
 */
const TIER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  bronze: { bg: 'orange.subtle', border: 'orange.emphasized', text: 'orange.fg' },
  silver: { bg: 'gray.subtle', border: 'gray.emphasized', text: 'gray.fg' },
  gold: { bg: 'yellow.subtle', border: 'yellow.emphasized', text: 'yellow.fg' },
  platinum: { bg: 'purple.subtle', border: 'purple.emphasized', text: 'purple.fg' },
}

interface AchievementItemProps {
  achievement: AchievementWithProgress
}

function AchievementItem({ achievement }: AchievementItemProps) {
  const tierConfig = TIER_COLORS[achievement.tier] || TIER_COLORS.bronze
  const isUnlocked = achievement.unlockedAt !== null

  return (
    <Box
      p={3}
      borderRadius="lg"
      bg={isUnlocked ? tierConfig.bg : 'bg.subtle'}
      border="1px"
      borderColor={isUnlocked ? tierConfig.border : 'border.subtle'}
      opacity={isUnlocked ? 1 : 0.7}
      position="relative"
    >
      <VStack align="stretch" gap={2}>
        <HStack justify="space-between">
          <HStack gap={2}>
            <Text fontSize="xl">{achievement.icon}</Text>
            <VStack align="start" gap={0}>
              <Text fontWeight="medium" fontSize="sm">
                {achievement.name}
              </Text>
              {isUnlocked && (
                <Badge
                  size="xs"
                  colorPalette={achievement.tier === 'gold'
                    ? 'yellow'
                    : achievement.tier === 'silver'
                    ? 'gray'
                    : achievement.tier === 'platinum'
                    ? 'purple'
                    : 'orange'}
                >
                  +{achievement.bonusReward} очков
                </Badge>
              )}
            </VStack>
          </HStack>
          {!isUnlocked && <Icon as={LuLock} color="fg.subtle" boxSize={4} />}
        </HStack>

        <Text fontSize="xs" color="fg.subtle">
          {achievement.description}
        </Text>

        {!isUnlocked && achievement.progress > 0 && (
          <Box>
            <HStack justify="space-between" mb={1}>
              <Text fontSize="xs" color="fg.subtle">
                Прогресс
              </Text>
              <Text fontSize="xs" color="fg.subtle">
                {Math.round(achievement.progress)}%
              </Text>
            </HStack>
            <Progress.Root value={achievement.progress} size="xs" colorPalette="blue">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          </Box>
        )}

        {isUnlocked && achievement.unlockedAt && (
          <Text fontSize="xs" color="fg.subtle">
            Получено: {new Date(achievement.unlockedAt).toLocaleDateString('ru-RU')}
          </Text>
        )}
      </VStack>
    </Box>
  )
}

export function AchievementsCard({ achievements, isLoading }: AchievementsCardProps) {
  if (isLoading) {
    return (
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Header>
          <HStack gap={3}>
            <Icon as={LuTrophy} color="orange.400" boxSize={5} />
            <Heading size="md">Достижения</Heading>
          </HStack>
        </Card.Header>
        <Card.Body>
          <Text color="fg.subtle">Загрузка...</Text>
        </Card.Body>
      </Card.Root>
    )
  }

  const unlockedCount = achievements.filter((a) => a.unlockedAt !== null).length
  const totalCount = achievements.length

  // Сортировка: сначала разблокированные, затем с прогрессом, затем остальные
  const sortedAchievements = [...achievements].sort((a, b) => {
    if (a.unlockedAt && !b.unlockedAt) {
      return -1
    }
    if (!a.unlockedAt && b.unlockedAt) {
      return 1
    }
    if (!a.unlockedAt && !b.unlockedAt) {
      return b.progress - a.progress
    }
    return 0
  })

  return (
    <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
      <Card.Header>
        <HStack gap={3} justify="space-between">
          <HStack gap={3}>
            <Icon as={LuTrophy} color="orange.400" boxSize={5} />
            <Heading size="md">Достижения</Heading>
          </HStack>
          <Badge colorPalette="orange" size="md">
            {unlockedCount}/{totalCount}
          </Badge>
        </HStack>
      </Card.Header>
      <Card.Body>
        {achievements.length === 0
          ? <Text color="fg.subtle">Нет доступных достижений</Text>
          : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
              {sortedAchievements.map((achievement) => (
                <AchievementItem key={achievement.id} achievement={achievement} />
              ))}
            </SimpleGrid>
          )}
      </Card.Body>
    </Card.Root>
  )
}
