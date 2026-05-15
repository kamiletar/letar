'use client'

import { Box, Text, VStack } from '@chakra-ui/react'
import { useLocale } from 'next-intl'
import { ACHIEVEMENTS_MAP } from '../_data/achievements'

interface AchievementCardProps {
  code: string
  unlocked: boolean
  unlockedAt?: Date
}

export function AchievementCard({ code, unlocked, unlockedAt }: AchievementCardProps) {
  const locale = useLocale()
  const isRu = locale === 'ru'
  const def = ACHIEVEMENTS_MAP.get(code)

  if (!def) {
    return null
  }

  return (
    <Box
      p={4}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={unlocked ? 'border' : 'border.muted'}
      bg={unlocked ? 'bg' : 'bg.subtle'}
      opacity={unlocked ? 1 : 0.5}
      minW="160px"
      transition="all 0.2s"
    >
      <VStack gap={1} align="start">
        <Text fontSize="2xl">{def.icon}</Text>
        <Text fontWeight="bold" fontSize="sm">
          {isRu ? def.label : def.labelEn}
        </Text>
        <Text fontSize="xs" color="fg.muted">
          {isRu ? def.description : def.descriptionEn}
        </Text>
        {unlocked && unlockedAt && (
          <Text fontSize="xs" color="fg.subtle">
            {new Date(unlockedAt).toLocaleDateString(isRu ? 'ru-RU' : 'en-US')}
          </Text>
        )}
        <Text fontSize="xs" color="blue.500" fontWeight="medium">
          +{def.xpReward} XP
        </Text>
      </VStack>
    </Box>
  )
}
