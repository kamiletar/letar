'use client'

/**
 * Компактный счёт матча для экрана ведущего
 *
 * Показывает команды, текущий счёт, тайм и раунд.
 */

import type { MatchSSEState } from '@/app/_hooks/use-match-sse'
import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'

interface CompactScoreboardProps {
  homeTeamName: string
  awayTeamName: string
  /** Начальный счёт из БД */
  initialHomeScore: number
  initialAwayScore: number
  /** Текущее состояние из SSE */
  matchState: MatchSSEState | null
  /** Перформансы для подсчёта текущего счёта */
  performances: Array<{
    teamSeasonId: string
    totalScore: number | null
  }>
  homeTeamId: string
  awayTeamId: string
}

export function CompactScoreboard({
  homeTeamName,
  awayTeamName,
  initialHomeScore,
  initialAwayScore,
  matchState,
  performances,
  homeTeamId,
  awayTeamId,
}: CompactScoreboardProps) {
  // Считаем текущий счёт из перформансов
  const { homeScore, awayScore } = useMemo(() => {
    let home = 0
    let away = 0
    for (const p of performances) {
      if (p.totalScore !== null) {
        if (p.teamSeasonId === homeTeamId) {
          home += p.totalScore
        } else if (p.teamSeasonId === awayTeamId) {
          away += p.totalScore
        }
      }
    }
    // Если нет перформансов, берём начальные
    if (performances.length === 0) {
      return { homeScore: initialHomeScore, awayScore: initialAwayScore }
    }
    return { homeScore: home, awayScore: away }
  }, [performances, homeTeamId, awayTeamId, initialHomeScore, initialAwayScore])

  const half = matchState?.currentHalf ?? 1
  const round = matchState?.currentRound ?? 1

  return (
    <Box bg="bg.subtle" borderRadius="xl" p={4} w="full">
      <HStack justify="space-between" align="center">
        <VStack gap={0} align="start" flex={1}>
          <Text fontSize="sm" color="fg.muted" lineClamp={1}>
            {homeTeamName}
          </Text>
          <Text fontSize="3xl" fontWeight="bold" lineHeight="1">
            {homeScore}
          </Text>
        </VStack>

        <VStack gap={0} align="center" px={3}>
          <Text fontSize="xs" color="fg.muted">
            Тайм {half}
          </Text>
          <Text fontSize="lg" fontWeight="bold" color="fg.muted">
            :
          </Text>
          <Text fontSize="xs" color="fg.muted">
            Раунд {round}
          </Text>
        </VStack>

        <VStack gap={0} align="end" flex={1}>
          <Text fontSize="sm" color="fg.muted" lineClamp={1}>
            {awayTeamName}
          </Text>
          <Text fontSize="3xl" fontWeight="bold" lineHeight="1">
            {awayScore}
          </Text>
        </VStack>
      </HStack>
    </Box>
  )
}
