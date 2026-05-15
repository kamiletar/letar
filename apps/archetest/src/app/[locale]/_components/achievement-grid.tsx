'use client'

import { Box, Heading, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { ACHIEVEMENT_CATEGORIES, type AchievementCategory, ACHIEVEMENTS } from '../_data/achievements'
import { AchievementCard } from './achievement-card'

interface AchievementGridProps {
  unlockedCodes: string[]
  unlockedDates?: Map<string, Date>
}

export function AchievementGrid({ unlockedCodes, unlockedDates }: AchievementGridProps) {
  const t = useTranslations('quiz.achievements')

  const unlockedSet = useMemo(() => new Set(unlockedCodes), [unlockedCodes])

  const grouped = useMemo(() => {
    const map = new Map<AchievementCategory, typeof ACHIEVEMENTS>()
    for (const cat of ACHIEVEMENT_CATEGORIES) {
      map.set(
        cat,
        ACHIEVEMENTS.filter((a) => a.category === cat)
      )
    }
    return map
  }, [])

  const categoryLabels: Record<AchievementCategory, string> = {
    sessions: t('categories.sessions'),
    answers: t('categories.answers'),
    results: t('categories.results'),
    special: t('categories.special'),
  }

  return (
    <VStack gap={6} w="100%" align="start">
      <Box>
        <Heading size="lg">{t('title')}</Heading>
        <Text fontSize="sm" color="fg.muted" mt={1}>
          {t('progress', { unlocked: unlockedCodes.length, total: ACHIEVEMENTS.length })}
        </Text>
      </Box>

      {ACHIEVEMENT_CATEGORIES.map((cat) => {
        const items = grouped.get(cat)
        if (!items || items.length === 0) {
          return null
        }
        return (
          <VStack key={cat} gap={3} w="100%" align="start">
            <Heading size="md">{categoryLabels[cat]}</Heading>
            <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={3} w="100%">
              {items.map((a) => (
                <AchievementCard
                  key={a.code}
                  code={a.code}
                  unlocked={unlockedSet.has(a.code)}
                  unlockedAt={unlockedDates?.get(a.code)}
                />
              ))}
            </SimpleGrid>
          </VStack>
        )
      })}
    </VStack>
  )
}
