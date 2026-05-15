'use client'

/**
 * Read-only счёт матча для экрана тренера
 *
 * Обновляется в реальном времени через SSE.
 */

import { Badge, Box, Flex, Heading, Text } from '@chakra-ui/react'

interface MatchScoreReadonlyProps {
  homeTeamName: string
  awayTeamName: string
  homeScore: number | null
  awayScore: number | null
  status: string
  coachSide: 'home' | 'away'
  currentHalf: number
  currentRound: number
}

export function MatchScoreReadonly({
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  status,
  coachSide,
  currentHalf,
  currentRound,
}: MatchScoreReadonlyProps) {
  return (
    <Box bg="bg.subtle" borderRadius="xl" p={4} textAlign="center">
      <Flex justify="center" gap={1} mb={2}>
        <Badge colorPalette={status === 'LIVE' ? 'red' : 'gray'} size="sm">
          {status === 'LIVE' ? 'LIVE' : status}
        </Badge>
        {status === 'LIVE' && (
          <Badge colorPalette="blue" size="sm">
            Тайм {currentHalf}, Раунд {currentRound}
          </Badge>
        )}
      </Flex>

      <Flex align="center" justify="center" gap={4}>
        <Box flex={1} textAlign="right">
          <Text
            fontSize="lg"
            fontWeight={coachSide === 'home' ? 'bold' : 'normal'}
            color={coachSide === 'home' ? 'fg' : 'fg.muted'}
          >
            {homeTeamName}
          </Text>
        </Box>

        <Heading size="2xl" fontVariantNumeric="tabular-nums">
          {homeScore ?? 0} : {awayScore ?? 0}
        </Heading>

        <Box flex={1} textAlign="left">
          <Text
            fontSize="lg"
            fontWeight={coachSide === 'away' ? 'bold' : 'normal'}
            color={coachSide === 'away' ? 'fg' : 'fg.muted'}
          >
            {awayTeamName}
          </Text>
        </Box>
      </Flex>
    </Box>
  )
}
