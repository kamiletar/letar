'use client'

/**
 * Крупный счёт для проектора
 *
 * Тёмный фон, максимально крупные цифры.
 */

import { Flex, Text } from '@chakra-ui/react'

interface LiveScoreboardProps {
  homeTeamName: string
  awayTeamName: string
  homeScore: number | null
  awayScore: number | null
  status: string
  currentHalf: number
  currentRound: number
}

export function LiveScoreboard({
  homeTeamName,
  awayTeamName,
  homeScore,
  awayScore,
  status,
  currentHalf,
  currentRound,
}: LiveScoreboardProps) {
  return (
    <Flex direction="column" align="center" gap={4}>
      {/* Статус */}
      {status === 'LIVE' && (
        <Text fontSize="md" color="red.400" fontWeight="bold" letterSpacing="wide">
          LIVE — Тайм {currentHalf}, Раунд {currentRound}
        </Text>
      )}
      {status === 'FINISHED' && (
        <Text fontSize="md" color="gray.500" fontWeight="bold" letterSpacing="wide">
          ЗАВЕРШЁН
        </Text>
      )}
      {status === 'SCHEDULED' && (
        <Text fontSize="md" color="blue.400" fontWeight="bold" letterSpacing="wide">
          ОЖИДАНИЕ
        </Text>
      )}

      {/* Команды и счёт */}
      <Flex align="center" justify="center" gap={{ base: 6, md: 12 }} w="full">
        <Text fontSize={{ base: '2xl', md: '4xl' }} fontWeight="bold" color="white" textAlign="right" flex={1}>
          {homeTeamName}
        </Text>

        <Text
          fontSize={{ base: '5xl', md: '8xl' }}
          fontWeight="bold"
          color="white"
          fontVariantNumeric="tabular-nums"
          lineHeight={1}
        >
          {homeScore ?? 0} : {awayScore ?? 0}
        </Text>

        <Text fontSize={{ base: '2xl', md: '4xl' }} fontWeight="bold" color="white" textAlign="left" flex={1}>
          {awayTeamName}
        </Text>
      </Flex>
    </Flex>
  )
}
