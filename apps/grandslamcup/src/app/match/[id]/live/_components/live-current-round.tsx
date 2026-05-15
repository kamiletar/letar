'use client'

/**
 * Текущая пара на проекторе — кто выступает, фаза голосования
 */

import type { CurrentPerformance, VotingPhase } from '@/lib/sse/match-state'
import { Box, Flex, Text } from '@chakra-ui/react'

interface LiveCurrentRoundProps {
  phase: VotingPhase
  currentPerformances: CurrentPerformance[]
  currentPerformerIndex: number
}

/** Текст фазы для проектора */
function phaseText(phase: VotingPhase): { text: string; color: string } {
  switch (phase) {
    case 'TEXT_VOTING':
      return { text: 'ГОЛОСОВАНИЕ: ТЕКСТ', color: 'yellow.400' }
    case 'TEXT_COMPLETE':
      return { text: 'ТЕКСТ ПОДСЧИТАН', color: 'green.400' }
    case 'DELIVERY_VOTING':
      return { text: 'ГОЛОСОВАНИЕ: ПОДАЧА', color: 'yellow.400' }
    case 'DELIVERY_COMPLETE':
      return { text: 'ПОДАЧА ПОДСЧИТАНА', color: 'green.400' }
    case 'ROUND_COMPLETE':
      return { text: 'РАУНД ЗАВЕРШЁН', color: 'green.400' }
    default:
      return { text: '', color: 'gray.500' }
  }
}

export function LiveCurrentRound({ phase, currentPerformances, currentPerformerIndex }: LiveCurrentRoundProps) {
  if (phase === 'IDLE' && currentPerformances.length === 0) {
    return null
  }

  const current = currentPerformances[currentPerformerIndex]
  const { text, color } = phaseText(phase)

  return (
    <Box textAlign="center">
      {/* Кто на сцене */}
      {current && (
        <Box mb={3}>
          <Text fontSize={{ base: 'xl', md: '3xl' }} color="white" fontWeight="bold">
            {current.playerName}
          </Text>
          <Text fontSize={{ base: 'md', md: 'lg' }} color="gray.400">
            {current.teamName}
          </Text>
        </Box>
      )}

      {/* Оба поэта в раунде */}
      {currentPerformances.length === 2 && (
        <Flex justify="center" gap={8} mb={3}>
          {currentPerformances.map((p, i) => (
            <Text
              key={p.performanceId}
              fontSize="lg"
              color={i === currentPerformerIndex ? 'white' : 'gray.600'}
              fontWeight={i === currentPerformerIndex ? 'bold' : 'normal'}
            >
              {p.playerName} ({p.teamName})
            </Text>
          ))}
        </Flex>
      )}

      {/* Фаза голосования */}
      {text && (
        <Text fontSize={{ base: 'lg', md: '2xl' }} color={color} fontWeight="bold" letterSpacing="wider">
          {text}
        </Text>
      )}
    </Box>
  )
}
