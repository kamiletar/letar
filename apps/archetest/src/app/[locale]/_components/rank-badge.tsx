'use client'

import { Box, HStack, Text } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { getNextRank, RANKS_MAP } from '../_data/ranks'
import { ScoreBar } from './score-bar'

interface RankBadgeProps {
  rankCode: string
  xp: number
  showProgress?: boolean
}

export function RankBadge({ rankCode, xp, showProgress = false }: RankBadgeProps) {
  const t = useTranslations('quiz.ranks')
  const locale = useLocale()
  const isRu = locale === 'ru'

  const rank = RANKS_MAP.get(rankCode)
  const nextRank = useMemo(() => getNextRank(rankCode), [rankCode])

  if (!rank) {
    return null
  }

  const label = isRu ? rank.label : rank.labelEn
  const progressPercent = nextRank ? Math.min(((xp - rank.minXp) / (nextRank.minXp - rank.minXp)) * 100, 100) : 100

  return (
    <Box>
      <HStack gap={2}>
        <Text fontSize="lg">{rank.icon}</Text>
        <Text fontWeight="bold" fontSize="md">
          {label}
        </Text>
        <Text fontSize="sm" color="fg.muted">
          {xp} XP
        </Text>
      </HStack>
      {showProgress && (
        <Box mt={2}>
          <ScoreBar value={progressPercent} color="blue.500" trackColor="bg.emphasized" animated />
          <Text fontSize="xs" color="fg.muted" mt={1}>
            {nextRank ? t('xpProgress', { current: xp, next: nextRank.minXp }) : t('maxRank')}
          </Text>
        </Box>
      )}
    </Box>
  )
}
